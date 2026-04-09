import { DesktopNotificationPayload, LocalMessage } from './index';

declare global {
  interface Window {
    coconutDesktop?: {
      setWindowMode: (mode: 'login' | 'main') => Promise<void>;
      notify: {
        showMessage: (payload: DesktopNotificationPayload) => Promise<boolean>;
      };
      roomWindow: {
        open: (roomId: string) => Promise<boolean>;
        minimizeCurrent: () => Promise<boolean>;
        closeCurrent: () => Promise<boolean>;
        shouldNotify: (roomId: string) => Promise<boolean>;
        onStateChanged: (callback: (payload: { roomId: string; state: 'open' | 'hidden' | 'closed' }) => void) => () => void;
      };
      db: {
        getMessages: (roomId: string) => Promise<LocalMessage[]>;
        upsertMessage: (message: LocalMessage) => Promise<LocalMessage>;
        upsertMessages: (messages: LocalMessage[]) => Promise<LocalMessage[]>;
        updateMessageStatus: (payload: { id: string; status: LocalMessage['status']; error?: string }) => Promise<void>;
      };
    };
  }
}

export {};
