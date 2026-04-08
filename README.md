# Coconut Talk

Coconut Talk is now a real multi-client desktop messenger MVP built with Electron, React, TypeScript, Tailwind CSS, Socket.IO, and local SQLite storage.

## Architecture

```text
.
├─ build/                 # Installer resources and app icons
├─ client/
│  ├─ electron/           # Electron main/preload process and SQLite IPC bridge
│  └─ src/                # React renderer, pages, components, store
├─ scripts/               # Small utility scripts such as icon generation
├─ server/                # Socket.IO relay server with in-memory rooms/memberships
├─ shared/                # Shared TypeScript models and typed socket events
├─ render.yaml            # Render deployment config for the relay server
└─ dist*/                 # Build output
```

## MVP Rules

- Socket.IO server is used only for live relay and room membership state.
- Chat messages are not stored on the server.
- Each client stores its own chat history locally in SQLite.
- Rooms and memberships live only in server memory.
- Restarting the server resets all rooms.
- Offline message delivery is not supported.
- Clients reconnect automatically and resync live room/user state.
- If a room disappears after server restart, the UI shows it as lost while keeping local message history visible.
- The packaged desktop app automatically starts a local relay server on `127.0.0.1:3030` if one is not already running.

## UI Status States

The app shows clear status for:

- `connecting / connected / disconnected`
- `sending / sent / failed` message delivery
- lost rooms after server restart

## Run In Development

```bash
npm install
npm run dev
```

`npm run dev` starts:

- the Socket.IO relay server on `http://127.0.0.1:3030`
- the Vite renderer on `http://localhost:5173`
- the Electron desktop shell

## Build

```bash
npm run build
```

## Run Only The Relay Server

```bash
npm install
npm run build
npm run start:server
```

The relay server listens on:

- local development: `127.0.0.1:3030`
- Render or other hosted platforms: `0.0.0.0:$PORT`

Health check endpoint:

```text
/health
```

## Deploy To Render

### Option 1. Use `render.yaml`

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** service from the repository.
3. Render will detect [render.yaml](C:/Coding%20Works/Coconnut%20Talk/render.yaml).
4. Deploy the service.
5. After deployment, copy the Render service URL.

### Option 2. Create Web Service manually

Use these settings in Render:

- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:server`
- Health Check Path: `/health`

### Client connection

In Coconut Talk login, open **서버 주소 설정** and enter your Render URL.

Example:

```text
https://your-service-name.onrender.com
```

## Create Windows Installer

```bash
npm run dist:win
```

The Windows installer will be created in:

```text
release/Coconut-Talk-Setup-0.1.0.exe
```

If you only want a packaged portable app directory, run:

```bash
npm run pack:win
```

## Icon Notes

- The installer and app icon use the Coconut Talk coconut face mark.
- Source assets live in `build/icon.png` and `build/icon.ico`.
- If you replace `build/icon.png`, regenerate the Windows icon with:

```bash
npm run make:icon
```

## Notes

- Local SQLite history is managed through Electron main-process IPC using `node:sqlite`.
- The server intentionally avoids persistence to keep the MVP simple and focused on real-time multi-user behavior.
- The current UI preserves the cute premium Coconut Talk direction while replacing fake mock interactions with live behavior.
