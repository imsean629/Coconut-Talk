import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('coconutDesktop', {
  setWindowMode: (mode: 'login' | 'main') => ipcRenderer.invoke('window:set-mode', mode),
  notify: {
    showMessage: (payload: { title: string; body: string; roomId?: string }) => ipcRenderer.invoke('notify:show-message', payload),
  },
  roomWindow: {
    open: (roomId: string) => ipcRenderer.invoke('room-window:open', roomId),
    minimizeCurrent: () => ipcRenderer.invoke('room-window:minimize-current'),
    closeCurrent: () => ipcRenderer.invoke('room-window:close-current'),
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
});
