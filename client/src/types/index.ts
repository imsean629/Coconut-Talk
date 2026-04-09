import { ChatMessage, ConnectionState, MessageDeliveryState, RoomLostReason, RoomSummary, ServerUser, TypingState } from '../../../shared/models';

export type NavItem = 'lounge' | 'users' | 'rooms';

export type Announcement = {
  id: string;
  title: string;
  body: string;
};

export type Toast = {
  id: string;
  title: string;
  description?: string;
};

export type DesktopNotificationPayload = {
  title: string;
  body: string;
  roomId?: string;
};

export type SessionProfile = {
  clientId: string;
  nickname: string;
  avatarSeed: string;
  color: string;
};

export type LocalMessage = ChatMessage & {
  status: MessageDeliveryState;
  error?: string;
};

export type LostRoom = RoomSummary & {
  lostAt: string;
  reason: RoomLostReason;
};

export type AppConnectionState = ConnectionState;
export type AppUser = ServerUser;
export type AppRoom = RoomSummary;
export type AppTypingState = TypingState;
