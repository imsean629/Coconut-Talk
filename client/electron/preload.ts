import { contextBridge, ipcRenderer } from 'electron';

const coconutDesktopApi = {
  setWindowMode: (mode: 'login' | 'main') => ipcRenderer.invoke('window:set-mode', mode),
  appWindow: {
    getCurrentOpacity: () => ipcRenderer.invoke('app-window:get-current-opacity'),
    setCurrentOpacity: (opacity: number) => ipcRenderer.invoke('app-window:set-current-opacity', opacity),
    minimizeCurrent: () => ipcRenderer.invoke('app-window:minimize-current'),
    closeCurrent: () => ipcRenderer.invoke('app-window:close-current'),
  },
  notify: {
    showMessage: (payload: { title: string; body: string; roomId?: string }) => ipcRenderer.invoke('notify:show-message', payload),
  },
  notificationPopup: {
    openTarget: (payload: { notificationId: string; roomId?: string }) => ipcRenderer.invoke('notification-popup:open-target', payload),
    dismiss: (notificationId: string) => ipcRenderer.invoke('notification-popup:dismiss', notificationId),
  },
  roomWindow: {
    open: (roomId: string) => ipcRenderer.invoke('room-window:open', roomId),
    getCurrentOpacity: () => {
      console.log('[preload] room-window:get-current-opacity');
      return ipcRenderer.invoke('room-window:get-current-opacity');
    },
    setCurrentOpacity: (opacity: number) => {
      console.log('[preload] room-window:set-current-opacity', opacity);
      return ipcRenderer.invoke('room-window:set-current-opacity', opacity);
    },
    minimizeCurrent: () => {
      console.log('[preload] room-window:minimize-current');
      return ipcRenderer.invoke('room-window:minimize-current');
    },
    closeCurrent: () => {
      console.log('[preload] room-window:close-current');
      return ipcRenderer.invoke('room-window:close-current');
    },
    shouldNotify: (roomId: string) => ipcRenderer.invoke('room-window:should-notify', roomId),
    onStateChanged: (callback: (payload: { roomId: string; state: 'open' | 'hidden' | 'closed' }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { roomId: string; state: 'open' | 'hidden' | 'closed' }) => callback(payload);
      ipcRenderer.on('room-window:state-changed', listener);
      return () => ipcRenderer.removeListener('room-window:state-changed', listener);
    },
  },
  db: {
    getMessages: (roomId: string) => ipcRenderer.invoke('db:get-messages', roomId),
    upsertMessage: (message: unknown) => ipcRenderer.invoke('db:upsert-message', message),
    upsertMessages: (messages: unknown[]) => ipcRenderer.invoke('db:upsert-messages', messages),
    updateMessageStatus: (payload: unknown) => ipcRenderer.invoke('db:update-message-status', payload),
  },
};

contextBridge.exposeInMainWorld('coconutDesktop', coconutDesktopApi);

try {
  // Fallback for windows where the isolated bridge is unexpectedly unavailable.
  (globalThis as typeof globalThis & { coconutDesktop?: typeof coconutDesktopApi }).coconutDesktop = coconutDesktopApi;
} catch {
  // Ignore direct assignment failures and rely on the isolated bridge.
}
