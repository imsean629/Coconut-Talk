import { DesktopNotificationPayload, LocalMessage } from './index';

declare global {
  interface Window {
    coconutDesktop?: {
      setWindowMode: (mode: 'login' | 'main') => Promise<void>;
      appWindow: {
        getCurrentOpacity: () => Promise<number>;
        setCurrentOpacity: (opacity: number) => Promise<number>;
        minimizeCurrent: () => Promise<boolean>;
        closeCurrent: () => Promise<boolean>;
      };
      notify: {
        showMessage: (payload: DesktopNotificationPayload) => Promise<boolean>;
      };
      notificationPopup: {
        openTarget: (payload: { notificationId: string; roomId?: string }) => Promise<boolean>;
        dismiss: (notificationId: string) => Promise<boolean>;
      };
      roomWindow: {
        open: (roomId: string) => Promise<boolean>;
        getCurrentOpacity: () => Promise<number>;
        setCurrentOpacity: (opacity: number) => Promise<number>;
        minimizeCurrent: () => Promise<boolean>;
        closeCurrent: () => Promise<boolean>;
        shouldNotify: (roomId: string) => Promise<boolean>;
        onStateChanged: (callback: (payload: { roomId: string; state: 'open' | 'hidden' | 'closed' }) => void) => () => void;
      };
      db: {
        getMessages: (roomId: string) => Promise<LocalMessage[]>;
        upsertMessage: (message: LocalMessage) => Promise<LocalMessage>;
        upsertMessages: (messages: LocalMessage[]) => Promise<LocalMessage[]>;
        storeImageDataUrl: (payload: { messageId: string; dataUrl: string }) => Promise<string>;
        updateMessageStatus: (payload: { id: string; status: LocalMessage['status']; error?: string }) => Promise<void>;
      };
    };
  }
}

export {};
