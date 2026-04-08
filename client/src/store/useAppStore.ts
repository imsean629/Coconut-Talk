import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import {
  AckErrorCode,
  ClientToServerEvents,
  CreateRoomPayload,
  InviteUsersPayload,
  JoinSessionPayload,
  RoomMutationAck,
  SendMessagePayload,
  ServerToClientEvents,
  SessionSyncPayload,
} from '../../../shared/events';
import { ConnectionState } from '../../../shared/models';
import { loungeAnnouncements, loungeFeed } from '../data/mockData';
import { Announcement, AppRoom, AppTypingState, AppUser, LocalMessage, LostRoom, SessionProfile, Toast } from '../types';
import { pickAvatarColor } from '../utils/format';

const DEFAULT_SERVER_URL = 'http://127.0.0.1:3030';
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const pushToast = (state: ChatState, title: string, description?: string): Pick<ChatState, 'toasts'> => ({ toasts: [...state.toasts, { id: makeId('toast'), title, description }] });

const normalizeServerUrl = (value?: string) => {
  const raw = value?.trim();
  if (!raw) return DEFAULT_SERVER_URL;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  return `http://${raw.replace(/\/$/, '')}`;
};

const normalizeAckError = (error?: AckErrorCode) => {
  switch (error) {
    case 'room_missing':
      return '대화방이 서버에서 사라졌어요.';
    case 'not_member':
      return '이 대화방에 참여 중인 멤버가 아니에요.';
    case 'invalid_password':
      return '비밀번호가 올바르지 않아요.';
    default:
      return '요청을 처리하지 못했어요.';
  }
};

type ChatState = {
  session: SessionProfile | null;
  serverUrl: string;
  hydrated: boolean;
  connectionState: ConnectionState;
  serverEpoch: string | null;
  users: AppUser[];
  rooms: AppRoom[];
  lostRooms: LostRoom[];
  messagesByRoom: Record<string, LocalMessage[]>;
  typingByRoom: Record<string, AppTypingState[]>;
  announcements: Announcement[];
  loungeFeed: string[];
  toasts: Toast[];
  initializeSession: () => void;
  login: (payload: { nickname: string; avatarVariant: string; serverUrl: string }) => void;
  logout: () => void;
  loadRoomMessages: (roomId: string) => Promise<void>;
  joinRoom: (roomId: string, password?: string) => Promise<AppRoom | null>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  createRoom: (payload: CreateRoomPayload) => Promise<AppRoom | null>;
  inviteUsers: (payload: InviteUsersPayload) => Promise<AppRoom | null>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  setTyping: (roomId: string, isTyping: boolean) => void;
  dismissToast: (id: string) => void;
};

const upsertRoomList = (rooms: AppRoom[], nextRoom: AppRoom) => {
  const existing = rooms.some((room) => room.id === nextRoom.id);
  const result = existing ? rooms.map((room) => (room.id === nextRoom.id ? nextRoom : room)) : [nextRoom, ...rooms];
  return result.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

const upsertMessageList = (messages: LocalMessage[], nextMessage: LocalMessage) => {
  const existing = messages.find((message) => message.id === nextMessage.id);
  const merged = existing ? messages.map((message) => (message.id === nextMessage.id ? { ...message, ...nextMessage } : message)) : [...messages, nextMessage];
  return merged.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
};

const markLostRoomsFromSync = (state: ChatState, payload: SessionSyncPayload): LostRoom[] => {
  if (!state.serverEpoch || state.serverEpoch === payload.serverEpoch) return state.lostRooms;
  const nextRoomIds = new Set(payload.rooms.map((room) => room.id));
  const lostFromRestart = state.rooms.filter((room) => !nextRoomIds.has(room.id)).map<LostRoom>((room) => ({ ...room, lostAt: new Date().toISOString(), reason: 'server_restart' }));
  const merged = [...state.lostRooms.filter((room) => !nextRoomIds.has(room.id)), ...lostFromRestart];
  return Array.from(new Map(merged.map((room) => [room.id, room])).values());
};

const setMessageStatus = async (id: string, status: LocalMessage['status'], error?: string) => {
  await window.coconutDesktop?.db.updateMessageStatus({ id, status, error });
  useChatStore.setState((state) => {
    const next: Record<string, LocalMessage[]> = {};
    Object.entries(state.messagesByRoom).forEach(([roomId, messages]) => {
      next[roomId] = messages.map((message) => (message.id === id ? { ...message, status, error } : message));
    });
    return { messagesByRoom: next };
  });
};

const handleRoomMissing = (roomId: string) => {
  useChatStore.setState((state) => {
    const room = state.rooms.find((item) => item.id === roomId) ?? state.lostRooms.find((item) => item.id === roomId);
    if (!room) return state;
    return {
      ...state,
      rooms: state.rooms.filter((item) => item.id !== roomId),
      lostRooms: [{ ...room, lostAt: new Date().toISOString(), reason: 'server_restart' }, ...state.lostRooms.filter((item) => item.id !== roomId)],
      ...pushToast(state, '대화방이 사라졌어요', '서버가 재시작되어 이 방은 더 이상 존재하지 않아요.'),
    };
  });
};

const removeRoomFromState = (roomId: string) => {
  useChatStore.setState((state) => ({
    rooms: state.rooms.filter((room) => room.id !== roomId),
    lostRooms: state.lostRooms.filter((room) => room.id !== roomId),
    typingByRoom: Object.fromEntries(Object.entries(state.typingByRoom).filter(([key]) => key !== roomId)),
  }));
};

const handleIncomingMessage = async (message: LocalMessage) => {
  await window.coconutDesktop?.db.upsertMessage(message);
  useChatStore.setState((state) => ({ messagesByRoom: { ...state.messagesByRoom, [message.roomId]: upsertMessageList(state.messagesByRoom[message.roomId] ?? [], message) } }));
};

const wireSocket = (session: SessionProfile, serverUrl: string) => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(serverUrl, { autoConnect: false, transports: ['websocket'] });

  const joinPayload: JoinSessionPayload = {
    clientId: session.clientId,
    nickname: session.nickname,
    avatarSeed: session.avatarSeed,
    color: session.color,
  };

  socket.on('connect', () => {
    useChatStore.setState({ connectionState: 'connecting' });
    socket?.emit('session:join', joinPayload, (payload: SessionSyncPayload) => {
      useChatStore.setState((state) => ({
        connectionState: 'connected',
        serverEpoch: payload.serverEpoch,
        users: payload.users,
        rooms: payload.rooms,
        lostRooms: markLostRoomsFromSync(state, payload).filter((room) => !payload.rooms.some((nextRoom) => nextRoom.id === room.id)),
      }));
    });
  });

  socket.on('disconnect', () => {
    useChatStore.setState({ connectionState: 'disconnected', typingByRoom: {} });
  });

  socket.on('connect_error', () => {
    useChatStore.setState((state) => ({ connectionState: 'disconnected', ...pushToast(state, '서버 연결 실패', `${state.serverUrl}에 연결할 수 없어요.`) }));
  });

  socket.io.on('reconnect_attempt', () => {
    useChatStore.setState({ connectionState: 'connecting' });
  });

  socket.on('presence:update', (users) => {
    useChatStore.setState({ users });
  });

  socket.on('rooms:upsert', (room) => {
    useChatStore.setState((state) => ({ rooms: upsertRoomList(state.rooms, room), lostRooms: state.lostRooms.filter((item) => item.id !== room.id) }));
  });

  socket.on('rooms:remove', ({ roomId }) => {
    removeRoomFromState(roomId);
  });

  socket.on('messages:new', async (message) => {
    const current = useChatStore.getState().session;
    await handleIncomingMessage({ ...message, status: current?.clientId === message.senderId ? 'sent' : 'received' });
  });

  socket.on('typing:update', (payload) => {
    useChatStore.setState((state) => {
      const current = state.typingByRoom[payload.roomId] ?? [];
      const filtered = current.filter((item) => item.clientId !== payload.clientId);
      return { typingByRoom: { ...state.typingByRoom, [payload.roomId]: payload.isTyping ? [...filtered, payload] : filtered } };
    });
  });

  useChatStore.setState({ connectionState: 'connecting' });
  socket.connect();
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      session: null,
      serverUrl: DEFAULT_SERVER_URL,
      hydrated: false,
      connectionState: 'disconnected',
      serverEpoch: null,
      users: [],
      rooms: [],
      lostRooms: [],
      messagesByRoom: {},
      typingByRoom: {},
      announcements: loungeAnnouncements,
      loungeFeed,
      toasts: [],
      initializeSession: () => {
        const session = get().session;
        if (session) wireSocket(session, normalizeServerUrl(get().serverUrl));
      },
      login: ({ nickname, avatarVariant, serverUrl }) => {
        const normalizedServerUrl = normalizeServerUrl(serverUrl);
        const session: SessionProfile = {
          clientId: get().session?.clientId ?? crypto.randomUUID(),
          nickname,
          avatarSeed: avatarVariant,
          color: pickAvatarColor(avatarVariant),
        };

        set((state) => ({ session, serverUrl: normalizedServerUrl, connectionState: 'connecting', ...pushToast(state, `${nickname}님 환영해요`, `${normalizedServerUrl}에 연결하고 있어요.`) }));
        wireSocket(session, normalizedServerUrl);
      },
      logout: () => {
        socket?.disconnect();
        socket = null;
        set({ session: null, connectionState: 'disconnected', serverEpoch: null, users: [], rooms: [], lostRooms: [], typingByRoom: {} });
      },
      loadRoomMessages: async (roomId) => {
        const messages = (await window.coconutDesktop?.db.getMessages(roomId)) ?? [];
        set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: messages } }));
      },
      joinRoom: async (roomId, password) => {
        const currentSocket = socket;
        if (!currentSocket) return null;
        return await new Promise((resolve) => {
          currentSocket.emit('rooms:join', { roomId, password }, (ack: RoomMutationAck) => {
            if (!ack.ok || !ack.room) {
              if (ack.error === 'room_missing') handleRoomMissing(roomId);
              set((state) => ({ ...pushToast(state, '대화방 입장 실패', normalizeAckError(ack.error)) }));
              resolve(null);
              return;
            }
            set((state) => ({ rooms: upsertRoomList(state.rooms, ack.room!) }));
            resolve(ack.room);
          });
        });
      },
      leaveRoom: async (roomId) => {
        const currentSocket = socket;
        if (!currentSocket) return false;
        return await new Promise((resolve) => {
          currentSocket.emit('rooms:leave', { roomId }, (ack: RoomMutationAck) => {
            if (!ack.ok && ack.error) {
              if (ack.error === 'room_missing') handleRoomMissing(roomId);
              set((state) => ({ ...pushToast(state, '대화방 나가기 실패', normalizeAckError(ack.error)) }));
              resolve(false);
              return;
            }

            if (ack.room) {
              set((state) => ({ rooms: upsertRoomList(state.rooms, ack.room!), ...pushToast(state, '대화방에서 나왔어요') }));
            } else {
              removeRoomFromState(roomId);
              set((state) => ({ ...pushToast(state, '대화방에서 나왔어요') }));
            }
            resolve(true);
          });
        });
      },
      createRoom: async (payload) => {
        const currentSocket = socket;
        if (!currentSocket) return null;
        return await new Promise((resolve) => {
          currentSocket.emit('rooms:create', payload, (ack: RoomMutationAck) => {
            if (!ack.ok || !ack.room) {
              set((state) => ({ ...pushToast(state, '방 만들기 실패', normalizeAckError(ack.error)) }));
              resolve(null);
              return;
            }
            set((state) => ({ rooms: upsertRoomList(state.rooms, ack.room!), ...pushToast(state, `${ack.room!.title} 방이 열렸어요`) }));
            resolve(ack.room);
          });
        });
      },
      inviteUsers: async (payload) => {
        const currentSocket = socket;
        if (!currentSocket) return null;
        return await new Promise((resolve) => {
          currentSocket.emit('rooms:invite', payload, (ack: RoomMutationAck) => {
            if (!ack.ok || !ack.room) {
              if (ack.error === 'room_missing') handleRoomMissing(payload.roomId);
              set((state) => ({ ...pushToast(state, '초대 실패', normalizeAckError(ack.error)) }));
              resolve(null);
              return;
            }
            set((state) => ({ rooms: upsertRoomList(state.rooms, ack.room!), ...pushToast(state, '초대가 전송됐어요', `${payload.userIds.length}명을 방에 추가했어요.`) }));
            resolve(ack.room);
          });
        });
      },
      sendMessage: async (roomId, content) => {
        const session = get().session;
        if (!session || !content.trim()) return;
        const optimistic: LocalMessage = {
          id: crypto.randomUUID(),
          roomId,
          senderId: session.clientId,
          senderNickname: session.nickname,
          senderAvatarSeed: session.avatarSeed,
          senderColor: session.color,
          content: content.trim(),
          createdAt: new Date().toISOString(),
          status: 'sending',
        };
        await handleIncomingMessage(optimistic);
        if (!socket || get().connectionState !== 'connected') {
          await setMessageStatus(optimistic.id, 'failed', '서버에 연결되어 있지 않아요.');
          return;
        }
        const payload: SendMessagePayload = { id: optimistic.id, roomId, content: optimistic.content };
        socket.emit('messages:send', payload, async (ack) => {
          if (!ack.ok) {
            await setMessageStatus(ack.messageId, 'failed', normalizeAckError(ack.error));
            if (ack.error === 'room_missing') handleRoomMissing(roomId);
            return;
          }
          await setMessageStatus(ack.messageId, 'sent');
        });
      },
      setTyping: (roomId, isTyping) => {
        if (!socket || get().connectionState !== 'connected') return;
        socket.emit('typing:update', { roomId, clientId: get().session?.clientId ?? '', isTyping });
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    }),
    {
      name: 'coconut-talk-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, serverUrl: state.serverUrl }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          state.serverUrl = normalizeServerUrl(state.serverUrl);
        }
      },
    },
  ),
);
