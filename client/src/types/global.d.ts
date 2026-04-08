import { LocalMessage } from './index';

declare global {
  interface Window {
    coconutDesktop?: {
      setWindowMode: (mode: 'login' | 'main') => Promise<void>;
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
