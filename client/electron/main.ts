import { BrowserWindow, app, ipcMain, screen, nativeImage } from 'electron';
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

let mainWindow: BrowserWindow | null = null;
let database: DatabaseSync;
let relayHandle: RelayServerHandle | null = null;

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

const loadRenderer = async () => {
  if (!mainWindow) return;
  if (!isDev) {
    await mainWindow.loadFile(packagedRendererPath);
    return;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await mainWindow.loadURL(devServerUrl);
      return;
    } catch (error) {
      lastError = error;
      await sleep(400);
    }
  }
  throw lastError;
};

const createWindow = async () => {
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

  await loadRenderer();
};

app.whenReady().then(async () => {
  initDatabase();
  await ensureLocalRelayServer();

  ipcMain.handle('window:set-mode', (_, mode: 'login' | 'main') => setWindowMode(mode));
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

  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
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
