import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  CreateRoomPayload,
  InviteUsersPayload,
  JoinRoomPayload,
  JoinSessionPayload,
  LeaveRoomPayload,
  RoomMutationAck,
  SendMessageAck,
  SendMessagePayload,
  ServerToClientEvents,
  SessionSyncPayload,
} from '../shared/events.js';
import { ChatMessage, RoomSummary, ServerUser, TypingState } from '../shared/models.js';

type SocketData = { clientId?: string };

type RoomRecord = RoomSummary & { password?: string };
type UserRecord = ServerUser & { socketIds: Set<string> };

export type RelayServerHandle = {
  port: number;
  started: boolean;
  close: () => Promise<void>;
};

const resolveRelayPort = (fallbackPort: number) => Number(process.env.PORT ?? process.env.COCONUT_SERVER_PORT ?? fallbackPort);
const resolveRelayHost = () => process.env.COCONUT_SERVER_HOST ?? (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');

export async function createRelayServer(port = 3030, silent = false): Promise<RelayServerHandle> {
  const resolvedPort = resolveRelayPort(port);
  const resolvedHost = resolveRelayHost();
  const serverEpoch = new Date().toISOString();
  const httpServer = createServer((request, response) => {
    if (request.url === '/' || request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: true, service: 'coconut-talk-relay', serverEpoch }));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: false, error: 'not_found' }));
  });
  const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, { cors: { origin: '*' } });

  const users = new Map<string, UserRecord>();
  const rooms = new Map<string, RoomRecord>();

  const serializeUser = (user: UserRecord): ServerUser => ({
    clientId: user.clientId,
    nickname: user.nickname,
    avatarSeed: user.avatarSeed,
    color: user.color,
    online: user.socketIds.size > 0,
    lastSeenAt: user.lastSeenAt,
  });

  const serializeRoom = (room: RoomRecord): RoomSummary => ({
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    participantIds: room.participantIds,
    createdBy: room.createdBy,
    createdAt: room.createdAt,
    hasPassword: room.hasPassword,
  });

  const getVisibleRooms = () => Array.from(rooms.values()).map(serializeRoom);

  const buildSyncPayload = (clientId: string): SessionSyncPayload => {
    const self = users.get(clientId);
    if (!self) throw new Error(`Unknown client: ${clientId}`);
    return {
      serverEpoch,
      self: serializeUser(self),
      users: Array.from(users.values()).map(serializeUser),
      rooms: getVisibleRooms(),
    };
  };

  const emitPresence = () => io.emit('presence:update', Array.from(users.values()).map(serializeUser));
  const emitRoom = (room: RoomRecord) => io.emit('rooms:upsert', serializeRoom(room));
  const emitRoomRemoved = (roomId: string) => io.emit('rooms:remove', { roomId });

  const joinSocketToVisibleRooms = (socketId: string, clientId: string) => {
    getVisibleRooms().forEach((room) => {
      if (room.type === 'public' || room.participantIds.includes(clientId)) {
        io.sockets.sockets.get(socketId)?.join(room.id);
      }
    });
  };

  const joinAllUserSocketsToRoom = (userId: string, roomId: string) => {
    const user = users.get(userId);
    if (!user) return;
    user.socketIds.forEach((socketId) => {
      io.sockets.sockets.get(socketId)?.join(roomId);
    });
  };

  const ensureMembership = (room: RoomRecord, clientId: string) => {
    if (!room.participantIds.includes(clientId)) room.participantIds = [...room.participantIds, clientId];
  };

  const roomAck = (room?: RoomRecord, error?: RoomMutationAck['error']): RoomMutationAck => ({ ok: Boolean(room) && !error, room: room ? serializeRoom(room) : undefined, error, serverEpoch });
  const messageAck = (messageId: string, error?: SendMessageAck['error']): SendMessageAck => ({ ok: !error, messageId, serverEpoch, error });

  const createMessage = (payload: SendMessagePayload, sender: UserRecord): ChatMessage => ({
    id: payload.id,
    roomId: payload.roomId,
    senderId: sender.clientId,
    senderNickname: sender.nickname,
    senderAvatarSeed: sender.avatarSeed,
    senderColor: sender.color,
    content: payload.content,
    messageType: payload.messageType === 'image' ? 'image' : 'text',
    imageData: payload.imageData,
    createdAt: new Date().toISOString(),
  });

  io.on('connection', (socket) => {
    socket.on('session:join', (payload: JoinSessionPayload, ack: (payload: SessionSyncPayload) => void) => {
      const previous = users.get(payload.clientId);
      const user: UserRecord = {
        clientId: payload.clientId,
        nickname: payload.nickname,
        avatarSeed: payload.avatarSeed,
        color: payload.color,
        online: true,
        lastSeenAt: new Date().toISOString(),
        socketIds: new Set(previous?.socketIds ?? []),
      };

      user.socketIds.add(socket.id);
      socket.data.clientId = payload.clientId;
      users.set(payload.clientId, user);
      joinSocketToVisibleRooms(socket.id, payload.clientId);
      ack(buildSyncPayload(payload.clientId));
      emitPresence();
    });

    socket.on('rooms:create', (payload: CreateRoomPayload, ack: (payload: RoomMutationAck) => void) => {
      const clientId = socket.data.clientId;
      if (!clientId) return void ack(roomAck(undefined, 'unknown'));

      const normalizedPassword = payload.type === 'private' ? payload.password?.trim() : undefined;
      const initialParticipantIds = payload.type === 'private' ? [clientId] : Array.from(new Set([clientId, ...payload.invitedUserIds]));
      const room: RoomRecord = {
        id: randomUUID(),
        title: payload.title.trim(),
        description: payload.description?.trim(),
        type: payload.type,
        participantIds: initialParticipantIds,
        createdBy: clientId,
        createdAt: new Date().toISOString(),
        hasPassword: Boolean(normalizedPassword),
        password: normalizedPassword,
      };

      rooms.set(room.id, room);
      room.participantIds.forEach((participantId) => joinAllUserSocketsToRoom(participantId, room.id));
      emitRoom(room);
      ack(roomAck(room));
    });

    socket.on('rooms:join', (payload: JoinRoomPayload, ack: (payload: RoomMutationAck) => void) => {
      const clientId = socket.data.clientId;
      if (!clientId) return void ack(roomAck(undefined, 'unknown'));
      const room = rooms.get(payload.roomId);
      if (!room) return void ack(roomAck(undefined, 'room_missing'));

      if (room.type === 'private' && room.hasPassword) {
        if ((payload.password ?? '').trim() !== (room.password ?? '')) {
          ack(roomAck(undefined, 'invalid_password'));
          return;
        }
      }

      ensureMembership(room, clientId);
      joinAllUserSocketsToRoom(clientId, room.id);
      emitRoom(room);
      ack(roomAck(room));
    });

    socket.on('rooms:leave', (payload: LeaveRoomPayload, ack: (payload: RoomMutationAck) => void) => {
      const clientId = socket.data.clientId;
      if (!clientId) return void ack(roomAck(undefined, 'unknown'));
      const room = rooms.get(payload.roomId);
      if (!room) return void ack(roomAck(undefined, 'room_missing'));
      if (!room.participantIds.includes(clientId)) return void ack(roomAck(undefined, 'not_member'));

      room.participantIds = room.participantIds.filter((participantId) => participantId !== clientId);
      users.get(clientId)?.socketIds.forEach((socketId) => {
        io.sockets.sockets.get(socketId)?.leave(room.id);
      });

      if (room.participantIds.length === 0) {
        rooms.delete(room.id);
        emitRoomRemoved(room.id);
        ack(roomAck(undefined));
        return;
      }

      if (room.createdBy === clientId) {
        room.createdBy = room.participantIds[0];
      }

      emitRoom(room);
      ack(roomAck(room));
    });

    socket.on('rooms:invite', (payload: InviteUsersPayload, ack: (payload: RoomMutationAck) => void) => {
      const clientId = socket.data.clientId;
      if (!clientId) return void ack(roomAck(undefined, 'unknown'));
      const room = rooms.get(payload.roomId);
      if (!room) return void ack(roomAck(undefined, 'room_missing'));
      if (!room.participantIds.includes(clientId)) return void ack(roomAck(undefined, 'not_member'));

       if (room.type === 'private') {
        ack(roomAck(room));
        return;
      }

      room.participantIds = Array.from(new Set([...room.participantIds, ...payload.userIds]));
      payload.userIds.forEach((userId) => joinAllUserSocketsToRoom(userId, room.id));

      emitRoom(room);
      ack(roomAck(room));
    });

    socket.on('messages:send', (payload: SendMessagePayload, ack: (payload: SendMessageAck) => void) => {
      const clientId = socket.data.clientId;
      if (!clientId) return void ack(messageAck(payload.id, 'unknown'));
      const sender = users.get(clientId);
      const room = rooms.get(payload.roomId);
      if (!sender) return void ack(messageAck(payload.id, 'unknown'));
      if (!room) return void ack(messageAck(payload.id, 'room_missing'));
      if (!room.participantIds.includes(clientId)) return void ack(messageAck(payload.id, 'not_member'));

      io.to(room.id).emit('messages:new', createMessage(payload, sender));
      ack(messageAck(payload.id));
    });

    socket.on('typing:update', (payload: Omit<TypingState, 'nickname'>) => {
      const clientId = socket.data.clientId;
      if (!clientId) return;
      const sender = users.get(clientId);
      if (!sender) return;
      socket.to(payload.roomId).emit('typing:update', { roomId: payload.roomId, clientId, nickname: sender.nickname, isTyping: payload.isTyping });
    });

    socket.on('disconnect', () => {
      const clientId = socket.data.clientId;
      if (!clientId) return;
      const user = users.get(clientId);
      if (!user) return;

      user.socketIds.delete(socket.id);
      user.lastSeenAt = new Date().toISOString();
      user.online = user.socketIds.size > 0;
      users.set(clientId, user);
      emitPresence();
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(resolvedPort, resolvedHost, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  if (!silent) {
    console.log(`Coconut Talk relay server running on http://${resolvedHost}:${resolvedPort}`);
    console.log(`Server epoch: ${serverEpoch}`);
  }

  return {
    port: resolvedPort,
    started: true,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
