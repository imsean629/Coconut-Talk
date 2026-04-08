import { ChatMessage, RoomSummary, RoomType, ServerUser, TypingState } from './models.js';

export type JoinSessionPayload = {
  clientId: string;
  nickname: string;
  avatarSeed: string;
  color: string;
};

export type SessionSyncPayload = {
  serverEpoch: string;
  self: ServerUser;
  users: ServerUser[];
  rooms: RoomSummary[];
};

export type CreateRoomPayload = {
  title: string;
  description?: string;
  type: RoomType;
  invitedUserIds: string[];
  password?: string;
};

export type InviteUsersPayload = {
  roomId: string;
  userIds: string[];
};

export type JoinRoomPayload = {
  roomId: string;
  password?: string;
};

export type LeaveRoomPayload = {
  roomId: string;
};

export type SendMessagePayload = {
  id: string;
  roomId: string;
  content: string;
};

export type AckErrorCode = 'room_missing' | 'not_member' | 'invalid_password' | 'unknown';

export type RoomMutationAck = {
  ok: boolean;
  room?: RoomSummary;
  error?: AckErrorCode;
  serverEpoch: string;
};

export type SendMessageAck = {
  ok: boolean;
  messageId: string;
  serverEpoch: string;
  error?: AckErrorCode;
};

export interface ServerToClientEvents {
  'session:sync': (payload: SessionSyncPayload) => void;
  'presence:update': (users: ServerUser[]) => void;
  'rooms:upsert': (room: RoomSummary) => void;
  'rooms:remove': (payload: { roomId: string }) => void;
  'messages:new': (message: ChatMessage) => void;
  'typing:update': (payload: TypingState) => void;
}

export interface ClientToServerEvents {
  'session:join': (payload: JoinSessionPayload, ack: (payload: SessionSyncPayload) => void) => void;
  'rooms:create': (payload: CreateRoomPayload, ack: (payload: RoomMutationAck) => void) => void;
  'rooms:invite': (payload: InviteUsersPayload, ack: (payload: RoomMutationAck) => void) => void;
  'rooms:join': (payload: JoinRoomPayload, ack: (payload: RoomMutationAck) => void) => void;
  'rooms:leave': (payload: LeaveRoomPayload, ack: (payload: RoomMutationAck) => void) => void;
  'messages:send': (payload: SendMessagePayload, ack: (payload: SendMessageAck) => void) => void;
  'typing:update': (payload: Omit<TypingState, 'nickname'>) => void;
}
