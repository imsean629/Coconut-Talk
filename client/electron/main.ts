import { BrowserWindow, Menu, Tray, app, ipcMain, nativeImage, screen } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRelayServer, RelayServerHandle } from '../../server/createRelayServer.js';
import { ChatMessageType, MessageDeliveryState } from '../../shared/models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LocalMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  senderAvatarSeed: string;
  senderColor: string;
  content: string;
  messageType: ChatMessageType;
  imageData?: string;
  createdAt: string;
  status: MessageDeliveryState;
  error?: string;
};

type RoomWindowState = 'open' | 'hidden' | 'closed';
type WindowBounds = { x: number; y: number; width: number; height: number };
type RoomWindowLayout = { bounds: WindowBounds; opacity: number };
type WindowLayoutStore = { roomWindows: Record<string, RoomWindowLayout> };

let mainWindow: BrowserWindow | null = null;
let database: DatabaseSync;
let relayHandle: RelayServerHandle | null = null;
let tray: Tray | null = null;
const roomWindows = new Map<string, BrowserWindow>();
const notificationWindows = new Map<string, BrowserWindow>();
const notificationOrder: string[] = [];
const flashingRoomWindows = new Set<string>();

const isDev = !app.isPackaged;
const devServerUrl = 'http://localhost:5173';
const relayPort = Number(process.env.COCONUT_SERVER_PORT ?? 3030);
const packagedRendererPath = path.resolve(__dirname, '../../../dist/index.html');
const packagedIconPath = path.resolve(__dirname, '../../../build/icon.png');
const devIconPath = path.join(process.cwd(), 'build', 'icon.png');
const iconPath = isDev ? devIconPath : packagedIconPath;
const windowLayoutPath = () => path.join(app.getPath('userData'), 'window-layouts.json');
const defaultRoomOpacity = 1;
const loginWindowSize = { width: 490, height: 640 };
const mainWindowSize = { width: 484, height: 600 };
const notificationWindowSize = { width: 320, height: 112 };
const messageImageDirectoryPath = () => path.join(app.getPath('userData'), 'message-images');

const ensureMessageImageDirectory = () => {
  fs.mkdirSync(messageImageDirectoryPath(), { recursive: true });
};

const storeImageDataUrl = (messageId: string, dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return dataUrl;

  const [, mimeType, base64Payload] = match;
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
  ensureMessageImageDirectory();
  const targetPath = path.join(messageImageDirectoryPath(), `${messageId}.${extension}`);
  fs.writeFileSync(targetPath, Buffer.from(base64Payload, 'base64'));
  return pathToFileURL(targetPath).toString();
};

const initDatabase = () => {
  const dbPath = path.join(app.getPath('userData'), 'coconut-talk.sqlite');
  database = new DatabaseSync(dbPath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_nickname TEXT NOT NULL,
      sender_avatar_seed TEXT NOT NULL,
      sender_color TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      image_data TEXT,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages (room_id, created_at);
  `);

  const existingColumns = database.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>;
  const columnNames = new Set(existingColumns.map((column) => column.name));
  if (!columnNames.has('message_type')) {
    database.exec(`ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';`);
  }
  if (!columnNames.has('image_data')) {
    database.exec(`ALTER TABLE messages ADD COLUMN image_data TEXT;`);
  }
};

const rowToMessage = (row: Record<string, unknown>): LocalMessage => ({
  id: String(row.id),
  roomId: String(row.room_id),
  senderId: String(row.sender_id),
  senderNickname: String(row.sender_nickname),
  senderAvatarSeed: String(row.sender_avatar_seed),
  senderColor: String(row.sender_color),
  content: String(row.content),
  messageType: (row.message_type ? String(row.message_type) : 'text') as ChatMessageType,
  imageData: row.image_data ? String(row.image_data) : undefined,
  createdAt: String(row.created_at),
  status: row.status as MessageDeliveryState,
  error: row.error ? String(row.error) : undefined,
});

const upsertMessage = (message: LocalMessage) => {
  const statement = database.prepare(`
    INSERT INTO messages (
      id, room_id, sender_id, sender_nickname, sender_avatar_seed, sender_color, content, message_type, image_data, created_at, status, error
    ) VALUES (
      :id, :roomId, :senderId, :senderNickname, :senderAvatarSeed, :senderColor, :content, :messageType, :imageData, :createdAt, :status, :error
    )
    ON CONFLICT(id) DO UPDATE SET
      room_id = excluded.room_id,
      sender_id = excluded.sender_id,
      sender_nickname = excluded.sender_nickname,
      sender_avatar_seed = excluded.sender_avatar_seed,
      sender_color = excluded.sender_color,
      content = excluded.content,
      message_type = excluded.message_type,
      image_data = excluded.image_data,
      created_at = excluded.created_at,
      status = excluded.status,
      error = excluded.error
  `);

  statement.run({
    ...message,
    imageData: message.imageData ?? null,
    error: message.error ?? null,
  });
  return message;
};

const centerBounds = (width: number, height: number) => {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
  };
};

const clampOpacity = (value: number) => Math.max(0.45, Math.min(1, Number.isFinite(value) ? value : defaultRoomOpacity));

const normalizeLayoutEntry = (value: unknown): RoomWindowLayout | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<RoomWindowLayout> & Partial<WindowBounds>;
  if (candidate.bounds) {
    const bounds = candidate.bounds;
    if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number' || typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
      return null;
    }
    return {
      bounds,
      opacity: clampOpacity(typeof candidate.opacity === 'number' ? candidate.opacity : defaultRoomOpacity),
    };
  }

  if (typeof candidate.x !== 'number' || typeof candidate.y !== 'number' || typeof candidate.width !== 'number' || typeof candidate.height !== 'number') {
    return null;
  }

  return {
    bounds: {
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
    },
    opacity: defaultRoomOpacity,
  };
};

const readWindowLayoutStore = (): WindowLayoutStore => {
  try {
    const raw = fs.readFileSync(windowLayoutPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<{ roomWindows: Record<string, unknown> }>;
    const roomWindows = Object.fromEntries(
      Object.entries(parsed.roomWindows ?? {}).flatMap(([roomId, layout]) => {
        const normalized = normalizeLayoutEntry(layout);
        return normalized ? [[roomId, normalized]] : [];
      }),
    );
    return { roomWindows };
  } catch {
    return { roomWindows: {} };
  }
};

const writeWindowLayoutStore = (store: WindowLayoutStore) => {
  fs.writeFileSync(windowLayoutPath(), JSON.stringify(store, null, 2), 'utf8');
};

const isBoundsVisible = (bounds: WindowBounds) =>
  screen.getAllDisplays().some(({ workArea }) => {
    const horizontalOverlap = Math.min(bounds.x + bounds.width, workArea.x + workArea.width) - Math.max(bounds.x, workArea.x);
    const verticalOverlap = Math.min(bounds.y + bounds.height, workArea.y + workArea.height) - Math.max(bounds.y, workArea.y);
    return horizontalOverlap > 120 && verticalOverlap > 120;
  });

const getSavedRoomBounds = (roomId: string): WindowBounds | null => {
  const saved = readWindowLayoutStore().roomWindows[roomId];
  if (!saved) return null;
  return isBoundsVisible(saved.bounds) ? saved.bounds : null;
};

const getSavedRoomOpacity = (roomId: string) => {
  const saved = readWindowLayoutStore().roomWindows[roomId];
  return saved ? clampOpacity(saved.opacity) : defaultRoomOpacity;
};

const saveRoomBounds = (roomId: string, window: BrowserWindow) => {
  if (window.isDestroyed()) return;
  const store = readWindowLayoutStore();
  store.roomWindows[roomId] = {
    bounds: window.getBounds(),
    opacity: clampOpacity(store.roomWindows[roomId]?.opacity ?? window.getOpacity()),
  };
  writeWindowLayoutStore(store);
};

const saveRoomOpacity = (roomId: string, opacity: number) => {
  const store = readWindowLayoutStore();
  store.roomWindows[roomId] = {
    bounds: store.roomWindows[roomId]?.bounds ?? centerBounds(720, 760),
    opacity: clampOpacity(opacity),
  };
  writeWindowLayoutStore(store);
};

const setWindowMode = (mode: 'login' | 'main') => {
  if (!mainWindow) return;

  if (mode === 'login') {
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(loginWindowSize.width, loginWindowSize.height);
    mainWindow.setMaximumSize(loginWindowSize.width, loginWindowSize.height);
    mainWindow.setBounds(centerBounds(loginWindowSize.width, loginWindowSize.height), true);
    return;
  }

  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(484, 600);
  mainWindow.setMaximumSize(10000, 10000);
  mainWindow.setBounds(centerBounds(mainWindowSize.width, mainWindowSize.height), true);
  mainWindow.focus();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureLocalRelayServer = async () => {
  try {
    relayHandle = await createRelayServer(relayPort, true);
    console.log(`Embedded Coconut Talk relay started on http://127.0.0.1:${relayPort}`);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
    if (code === 'EADDRINUSE') {
      console.log(`Relay port ${relayPort} already in use, reusing existing local server.`);
      return;
    }
    throw error;
  }
};

const loadRenderer = async (targetWindow: BrowserWindow, query?: Record<string, string>) => {
  if (!isDev) {
    await targetWindow.loadFile(packagedRendererPath, query ? { query } : undefined);
    return;
  }

  const url = new URL(devServerUrl);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await targetWindow.loadURL(url.toString());
      return;
    } catch (error) {
      lastError = error;
      await sleep(400);
    }
  }
  throw lastError;
};

const emitRoomWindowState = (roomId: string, state: RoomWindowState) => {
  mainWindow?.webContents.send('room-window:state-changed', { roomId, state });
};

const hideWindowMenu = (targetWindow: BrowserWindow) => {
  targetWindow.setMenuBarVisibility(false);
  targetWindow.removeMenu();
};

const buildRoomWindowOptions = () => ({
  minWidth: 560,
  minHeight: 520,
  show: false,
  backgroundColor: '#f7ecdd',
  title: 'Coconut Talk',
  frame: false,
  resizable: true,
  icon: nativeImage.createFromPath(iconPath),
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  },
});

const stopWindowFlash = (targetWindow: BrowserWindow | null, roomId?: string) => {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  targetWindow.flashFrame(false);
  if (roomId) {
    flashingRoomWindows.delete(roomId);
  }
};

const startWindowFlash = (targetWindow: BrowserWindow | null, roomId?: string) => {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  if (roomId && flashingRoomWindows.has(roomId)) return;
  targetWindow.flashFrame(true);
  if (roomId) {
    flashingRoomWindows.add(roomId);
  }
};

const getNotificationBounds = (index: number) => {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: Math.round(workArea.x + workArea.width - notificationWindowSize.width - 16),
    y: Math.round(workArea.y + workArea.height - notificationWindowSize.height - 16 - index * (notificationWindowSize.height + 12)),
  };
};

const positionNotificationWindows = () => {
  notificationOrder.forEach((notificationId, index) => {
    const popup = notificationWindows.get(notificationId);
    if (!popup || popup.isDestroyed()) return;
    const { x, y } = getNotificationBounds(index);
    popup.setPosition(x, y, true);
  });
};

const closeNotificationWindow = (notificationId: string) => {
  const popup = notificationWindows.get(notificationId);
  if (popup && !popup.isDestroyed()) {
    popup.close();
    return;
  }

  const nextIndex = notificationOrder.indexOf(notificationId);
  if (nextIndex >= 0) notificationOrder.splice(nextIndex, 1);
  notificationWindows.delete(notificationId);
  positionNotificationWindows();
};

const createNotificationWindow = async (payload: { title: string; body: string; roomId?: string }) => {
  const notificationId = randomUUID();
  const popup = new BrowserWindow({
    width: notificationWindowSize.width,
    height: notificationWindowSize.height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  hideWindowMenu(popup);
  notificationWindows.set(notificationId, popup);
  notificationOrder.unshift(notificationId);
  positionNotificationWindows();

  popup.on('closed', () => {
    notificationWindows.delete(notificationId);
    const nextIndex = notificationOrder.indexOf(notificationId);
    if (nextIndex >= 0) notificationOrder.splice(nextIndex, 1);
    positionNotificationWindows();
  });

  await loadRenderer(popup, {
    view: 'notification',
    notificationId,
    title: payload.title,
    body: payload.body,
    roomId: payload.roomId ?? '',
  });

  if (!popup.isDestroyed()) {
    popup.showInactive();
    popup.moveTop();
    setTimeout(() => closeNotificationWindow(notificationId), 4200);
  }

  return notificationId;
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    ...centerBounds(loginWindowSize.width, loginWindowSize.height),
    minWidth: loginWindowSize.width,
    minHeight: loginWindowSize.height,
    backgroundColor: '#00000000',
    transparent: true,
    title: 'Coconut Talk',
    frame: false,
    resizable: false,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  hideWindowMenu(mainWindow);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const targetUrl = new URL(url);
    const isRoomPopup = targetUrl.searchParams.get('view') === 'room' && !!targetUrl.searchParams.get('roomId');
    if (!isRoomPopup) {
      return { action: 'allow' };
    }

    const roomId = targetUrl.searchParams.get('roomId');
    console.log('[window-open-handler] redirecting popup to managed room window', targetUrl.toString());
    if (roomId) {
      void createRoomWindow(roomId);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    hideWindowMenu(childWindow);
  });
  await loadRenderer(mainWindow);
};

const ensureTray = () => {
  if (tray) return tray;

  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 }));
  tray.setToolTip('Coconut Talk');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '코코넛톡 열기',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: '종료',
        click: () => {
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  return tray;
};

const getRoomIdForWindow = (targetWindow: BrowserWindow) =>
  Array.from(roomWindows.entries()).find(([, candidate]) => candidate === targetWindow)?.[0] ?? null;

const showRoomWindow = (roomId: string) => {
  const existing = roomWindows.get(roomId);
  if (!existing || existing.isDestroyed()) {
    return false;
  }

  stopWindowFlash(existing, roomId);
  existing.show();
  existing.focus();
  emitRoomWindowState(roomId, 'open');
  return true;
};

const createRoomWindow = async (roomId: string) => {
  const existing = roomWindows.get(roomId);
  if (existing && !existing.isDestroyed()) {
    console.log('[room-window] reusing existing window', roomId);
    showRoomWindow(roomId);
    return existing;
  }

  const initialBounds = getSavedRoomBounds(roomId) ?? centerBounds(720, 760);
  const initialOpacity = getSavedRoomOpacity(roomId);
  const roomWindow = new BrowserWindow({
    ...initialBounds,
    ...buildRoomWindowOptions(),
  });
  roomWindow.setOpacity(initialOpacity);
  console.log('[room-window] created', roomId, roomWindow.getBounds(), {
    frame: roomWindow.isMenuBarVisible() ? 'menu-visible' : 'menu-hidden',
  });

  hideWindowMenu(roomWindow);
  roomWindows.set(roomId, roomWindow);

  let boundsSaveTimer: NodeJS.Timeout | null = null;
  const queueBoundsSave = () => {
    if (boundsSaveTimer) clearTimeout(boundsSaveTimer);
    boundsSaveTimer = setTimeout(() => {
      saveRoomBounds(roomId, roomWindow);
      boundsSaveTimer = null;
    }, 180);
  };

  roomWindow.on('show', () => emitRoomWindowState(roomId, 'open'));
  roomWindow.on('show', () => stopWindowFlash(roomWindow, roomId));
  roomWindow.on('focus', () => {
    stopWindowFlash(roomWindow, roomId);
    emitRoomWindowState(roomId, 'open');
  });
  roomWindow.on('resized', queueBoundsSave);
  roomWindow.on('moved', queueBoundsSave);
  roomWindow.on('close', () => saveRoomBounds(roomId, roomWindow));
  roomWindow.on('closed', () => {
    if (boundsSaveTimer) clearTimeout(boundsSaveTimer);
    roomWindows.delete(roomId);
    stopWindowFlash(roomWindow, roomId);
    emitRoomWindowState(roomId, 'closed');
  });

  await loadRenderer(roomWindow, { view: 'room', roomId });
  if (!roomWindow.isDestroyed()) {
    roomWindow.show();
    roomWindow.focus();
    roomWindow.moveTop();
    roomWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      if (!roomWindow.isDestroyed()) {
        roomWindow.setAlwaysOnTop(false);
      }
    }, 1200);
    emitRoomWindowState(roomId, 'open');
  }
  return roomWindow;
};

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  initDatabase();
  await ensureLocalRelayServer();

  ipcMain.handle('window:set-mode', (_, mode: 'login' | 'main') => setWindowMode(mode));
  ipcMain.handle('app-window:minimize-current', (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return false;
    targetWindow.minimize();
    return true;
  });
  ipcMain.handle('app-window:get-current-opacity', (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    return targetWindow ? clampOpacity(targetWindow.getOpacity()) : defaultRoomOpacity;
  });
  ipcMain.handle('app-window:set-current-opacity', (event, opacity: number) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return defaultRoomOpacity;

    const nextOpacity = clampOpacity(opacity);
    targetWindow.setOpacity(nextOpacity);
    return nextOpacity;
  });
  ipcMain.handle('app-window:close-current', (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return false;
    targetWindow.close();
    return true;
  });
  ipcMain.handle('notify:show-message', async (_, payload: { title: string; body: string; roomId?: string }) => {
    if (payload.roomId) {
      const roomWindow = roomWindows.get(payload.roomId);
      const shouldFlashRoom = !!roomWindow && !roomWindow.isDestroyed() && (!roomWindow.isVisible() || !roomWindow.isFocused());
      if (shouldFlashRoom) {
        startWindowFlash(roomWindow, payload.roomId);
      } else if (!shouldFlashRoom && mainWindow && (!mainWindow.isVisible() || !mainWindow.isFocused())) {
        startWindowFlash(mainWindow);
      }
    } else if (mainWindow && (!mainWindow.isVisible() || !mainWindow.isFocused())) {
      startWindowFlash(mainWindow);
    }

    await createNotificationWindow(payload);
    return true;
  });
  ipcMain.handle('notification-popup:open-target', async (_, payload: { notificationId: string; roomId?: string }) => {
    closeNotificationWindow(payload.notificationId);
    if (payload.roomId) {
      await createRoomWindow(payload.roomId);
      return true;
    }
    mainWindow?.show();
    mainWindow?.focus();
    return true;
  });
  ipcMain.handle('notification-popup:dismiss', async (_, notificationId: string) => {
    closeNotificationWindow(notificationId);
    return true;
  });
  ipcMain.handle('room-window:open', async (_, roomId: string) => {
    console.log('[room-window] open requested', roomId);
    await createRoomWindow(roomId);
    return true;
  });
  ipcMain.handle('room-window:get-current-opacity', (event) => {
    console.log('[ipcMain] room-window:get-current-opacity');
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    return targetWindow ? clampOpacity(targetWindow.getOpacity()) : defaultRoomOpacity;
  });
  ipcMain.handle('room-window:set-current-opacity', (event, opacity: number) => {
    console.log('[ipcMain] room-window:set-current-opacity', opacity);
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return defaultRoomOpacity;

    const nextOpacity = clampOpacity(opacity);
    targetWindow.setOpacity(nextOpacity);
    const roomId = getRoomIdForWindow(targetWindow);
    if (roomId) {
      saveRoomOpacity(roomId, nextOpacity);
    }
    return nextOpacity;
  });
  ipcMain.handle('room-window:minimize-current', (event) => {
    console.log('[ipcMain] room-window:minimize-current');
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return false;

    const roomId = getRoomIdForWindow(targetWindow);
    if (roomId) {
      emitRoomWindowState(roomId, 'hidden');
    }
    targetWindow.minimize();
    return true;
  });
  ipcMain.handle('room-window:close-current', (event) => {
    console.log('[ipcMain] room-window:close-current');
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return false;

    targetWindow.close();
    return true;
  });
  ipcMain.handle('room-window:should-notify', (_, roomId: string) => {
    const roomWindow = roomWindows.get(roomId);
    if (!roomWindow || roomWindow.isDestroyed()) {
      return true;
    }

    return !roomWindow.isVisible() || !roomWindow.isFocused();
  });
  ipcMain.handle('db:get-messages', (_, roomId: string) => {
      const statement = database.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC');
    return statement.all(roomId).map((row) => rowToMessage(row as Record<string, unknown>));
  });
  ipcMain.handle('db:upsert-message', (_, message: LocalMessage) => upsertMessage(message));
  ipcMain.handle('db:upsert-messages', (_, messages: LocalMessage[]) => messages.map((message) => upsertMessage(message)));
  ipcMain.handle('db:store-image-data-url', (_, payload: { messageId: string; dataUrl: string }) => storeImageDataUrl(payload.messageId, payload.dataUrl));
  ipcMain.handle('db:update-message-status', (_, payload: { id: string; status: MessageDeliveryState; error?: string }) => {
      const statement = database.prepare('UPDATE messages SET status = ?, error = ? WHERE id = ?');
      statement.run(payload.status, payload.error ?? null, payload.id);
    });

  await createMainWindow();
  mainWindow?.on('focus', () => stopWindowFlash(mainWindow));
  mainWindow?.on('show', () => stopWindowFlash(mainWindow));
  ensureTray();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('before-quit', async () => {
  if (relayHandle) {
    try {
      await relayHandle.close();
    } catch {
      // Ignore shutdown errors from the embedded relay.
    }
    relayHandle = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
