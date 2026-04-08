import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('coconutDesktop', {
  setWindowMode: (mode: 'login' | 'main') => ipcRenderer.invoke('window:set-mode', mode),
  db: {
    getMessages: (roomId: string) => ipcRenderer.invoke('db:get-messages', roomId),
    upsertMessage: (message: unknown) => ipcRenderer.invoke('db:upsert-message', message),
    upsertMessages: (messages: unknown[]) => ipcRenderer.invoke('db:upsert-messages', messages),
    updateMessageStatus: (payload: unknown) => ipcRenderer.invoke('db:update-message-status', payload),
  },
});
