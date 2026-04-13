export type RoomType = 'public' | 'private';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export type MessageDeliveryState = 'sending' | 'sent' | 'failed' | 'received';
export type ChatMessageType = 'text' | 'image';

export type ServerUser = {
  clientId: string;
  nickname: string;
  avatarSeed: string;
  color: string;
  online: boolean;
  lastSeenAt: string;
};

export type RoomSummary = {
  id: string;
  title: string;
  description?: string;
  type: RoomType;
  participantIds: string[];
  createdBy: string;
  createdAt: string;
  hasPassword: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  senderAvatarSeed: string;
  senderColor: string;
  content: string;
  messageType: ChatMessageType;
  imageData?: string;
  createdAt: string;
};

export type TypingState = {
  roomId: string;
  clientId: string;
  nickname: string;
  isTyping: boolean;
};

export type RoomLostReason = 'server_restart' | 'room_unavailable';
