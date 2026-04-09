import { BrowserWindow, Menu, Notification, Tray, app, ipcMain, nativeImage, screen } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRelayServer, RelayServerHandle } from '../../server/createRelayServer.js';
import { MessageDeliveryState } from '../../shared/models.js';

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
  createdAt: string;
  status: MessageDeliveryState;
  error?: string;
};

type RoomWindowState = 'open' | 'hidden' | 'closed';

let mainWindow: BrowserWindow | null = null;
let database: DatabaseSync;
let relayHandle: RelayServerHandle | null = null;
let tray: Tray | null = null;
const roomWindows = new Map<string, BrowserWindow>();

const isDev = !app.isPackaged;
const devServerUrl = 'http://localhost:5173';
const relayPort = Number(process.env.COCONUT_SERVER_PORT ?? 3030);
const packagedRendererPath = path.resolve(__dirname, '../../../dist/index.html');
const packagedIconPath = path.resolve(__dirname, '../../../build/icon.png');
const devIconPath = path.join(process.cwd(), 'build', 'icon.png');
const iconPath = isDev ? devIconPath : packagedIconPath;

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
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages (room_id, created_at);
  `);
};

const rowToMessage = (row: Record<string, unknown>): LocalMessage => ({
  id: String(row.id),
  roomId: String(row.room_id),
  senderId: String(row.sender_id),
  senderNickname: String(row.sender_nickname),
  senderAvatarSeed: String(row.sender_avatar_seed),
  senderColor: String(row.sender_color),
  content: String(row.content),
  createdAt: String(row.created_at),
  status: row.status as MessageDeliveryState,
  error: row.error ? String(row.error) : undefined,
});

const upsertMessage = (message: LocalMessage) => {
  const statement = database.prepare(`
    INSERT INTO messages (
      id, room_id, sender_id, sender_nickname, sender_avatar_seed, sender_color, content, created_at, status, error
    ) VALUES (
      :id, :roomId, :senderId, :senderNickname, :senderAvatarSeed, :senderColor, :content, :createdAt, :status, :error
    )
    ON CONFLICT(id) DO UPDATE SET
      room_id = excluded.room_id,
      sender_id = excluded.sender_id,
      sender_nickname = excluded.sender_nickname,
      sender_avatar_seed = excluded.sender_avatar_seed,
      sender_color = excluded.sender_color,
      content = excluded.content,
      created_at = excluded.created_at,
      status = excluded.status,
      error = excluded.error
  `);

  statement.run({
    ...message,
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

const setWindowMode = (mode: 'login' | 'main') => {
  if (!mainWindow) return;

  if (mode === 'login') {
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(520, 640);
    mainWindow.setBounds(centerBounds(520, 640), true);
    return;
  }

  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(800, 720);
  mainWindow.setBounds(centerBounds(800, 820), true);
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

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    ...centerBounds(520, 640),
    minWidth: 520,
    minHeight: 640,
    backgroundColor: '#f7ecdd',
    title: 'Coconut Talk',
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    resizable: true,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
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

  existing.show();
  existing.focus();
  emitRoomWindowState(roomId, 'open');
  return true;
};

const createRoomWindow = async (roomId: string) => {
  const existing = roomWindows.get(roomId);
  if (existing && !existing.isDestroyed()) {
    showRoomWindow(roomId);
    return existing;
  }

  const roomWindow = new BrowserWindow({
    ...centerBounds(720, 760),
    width: 720,
    height: 760,
    minWidth: 560,
    minHeight: 520,
    show: false,
    backgroundColor: '#f7ecdd',
    title: 'Coconut Talk',
    autoHideMenuBar: true,
    resizable: true,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  roomWindows.set(roomId, roomWindow);

  roomWindow.on('show', () => emitRoomWindowState(roomId, 'open'));
  roomWindow.on('focus', () => emitRoomWindowState(roomId, 'open'));
  roomWindow.on('closed', () => {
    roomWindows.delete(roomId);
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
  initDatabase();
  await ensureLocalRelayServer();

  ipcMain.handle('window:set-mode', (_, mode: 'login' | 'main') => setWindowMode(mode));
  ipcMain.handle('notify:show-message', async (_, payload: { title: string; body: string; roomId?: string }) => {
    if (!Notification.isSupported()) {
      return false;
    }

    const notification = new Notification({
      title: payload.title,
      body: payload.body,
      icon: nativeImage.createFromPath(iconPath),
      silent: false,
    });

    notification.on('click', () => {
      if (payload.roomId) {
        void createRoomWindow(payload.roomId);
      } else {
        mainWindow?.show();
        mainWindow?.focus();
      }
    });
    notification.show();
    return true;
  });
  ipcMain.handle('room-window:open', async (_, roomId: string) => {
    await createRoomWindow(roomId);
    return true;
  });
  ipcMain.handle('room-window:minimize-current', (event) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return false;

    const roomId = getRoomIdForWindow(targetWindow);
    if (!roomId) {
      targetWindow.minimize();
      return true;
    }

    targetWindow.hide();
    emitRoomWindowState(roomId, 'hidden');
    return true;
  });
  ipcMain.handle('room-window:close-current', (event) => {
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
  ipcMain.handle('db:update-message-status', (_, payload: { id: string; status: MessageDeliveryState; error?: string }) => {
    const statement = database.prepare('UPDATE messages SET status = ?, error = ? WHERE id = ?');
    statement.run(payload.status, payload.error ?? null, payload.id);
  });

  await createMainWindow();
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
