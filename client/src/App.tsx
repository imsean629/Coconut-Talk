import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LoginPopup } from './components/LoginPopup';
import { Sidebar } from './components/layout/Sidebar';
import { CreateRoomModal } from './components/modals/CreateRoomModal';
import { InviteUsersModal } from './components/modals/InviteUsersModal';
import { LogoutConfirmModal } from './components/modals/LogoutConfirmModal';
import { PrivateRoomPasswordModal } from './components/modals/PrivateRoomPasswordModal';
import { ToastLayer } from './components/ui/ToastLayer';
import { LoungePage } from './pages/LoungePage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { RoomsPage } from './pages/RoomsPage';
import { UsersPage } from './pages/UsersPage';
import { useChatStore } from './store/useAppStore';
import { AppRoom, NavItem } from './types';

const readWindowMode = () => {
  if (typeof window === 'undefined') {
    return { isRoomWindow: false, roomId: null as string | null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  return {
    isRoomWindow: searchParams.get('view') === 'room',
    roomId: searchParams.get('roomId'),
  };
};

function MainShell() {
  const session = useChatStore((state) => state.session);
  const hydrated = useChatStore((state) => state.hydrated);
  const serverUrl = useChatStore((state) => state.serverUrl);
  const connectionState = useChatStore((state) => state.connectionState);
  const users = useChatStore((state) => state.users);
  const rooms = useChatStore((state) => state.rooms);
  const lostRooms = useChatStore((state) => state.lostRooms);
  const announcements = useChatStore((state) => state.announcements);
  const feed = useChatStore((state) => state.loungeFeed);
  const messagesByRoom = useChatStore((state) => state.messagesByRoom);
  const initializeSession = useChatStore((state) => state.initializeSession);
  const loadRoomMessages = useChatStore((state) => state.loadRoomMessages);
  const login = useChatStore((state) => state.login);
  const logout = useChatStore((state) => state.logout);
  const joinRoom = useChatStore((state) => state.joinRoom);
  const leaveRoom = useChatStore((state) => state.leaveRoom);
  const createRoom = useChatStore((state) => state.createRoom);

  const [activeNav, setActiveNav] = useState<NavItem>('lounge');
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [passwordTargetRoom, setPasswordTargetRoom] = useState<AppRoom | null>(null);

  const previousLastMessageRef = useRef<Record<string, string>>({});
  const messageBootstrapRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    initializeSession();
  }, [hydrated, initializeSession]);

  useEffect(() => {
    window.coconutDesktop?.setWindowMode(session ? 'main' : 'login');
  }, [session]);

  useEffect(() => {
    const unsubscribe = window.coconutDesktop?.roomWindow.onStateChanged((payload) => {
      if (payload.state === 'open') {
        setUnreadByRoom((current) => {
          if (!(payload.roomId in current)) return current;
          const next = { ...current };
          delete next[payload.roomId];
          return next;
        });
      }
    });

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!session) {
      previousLastMessageRef.current = {};
      messageBootstrapRef.current = false;
      setUnreadByRoom({});
      return;
    }

    const nextSnapshot: Record<string, string> = {};
    Object.entries(messagesByRoom).forEach(([roomId, messages]) => {
      const lastMessage = messages.at(-1);
      if (lastMessage) {
        nextSnapshot[roomId] = lastMessage.id;
      }
    });

    if (!messageBootstrapRef.current) {
      previousLastMessageRef.current = nextSnapshot;
      messageBootstrapRef.current = true;
      return;
    }

    Object.entries(messagesByRoom).forEach(([roomId, messages]) => {
      const lastMessage = messages.at(-1);
      if (!lastMessage) return;
      if (previousLastMessageRef.current[roomId] === lastMessage.id) return;
      if (lastMessage.senderId === session.clientId) return;

      void (async () => {
        const shouldNotify = (await window.coconutDesktop?.roomWindow.shouldNotify(roomId)) ?? true;
        if (shouldNotify) {
          setUnreadByRoom((current) => ({ ...current, [roomId]: (current[roomId] ?? 0) + 1 }));
          const room = rooms.find((item) => item.id === roomId) ?? lostRooms.find((item) => item.id === roomId);
          await window.coconutDesktop?.notify.showMessage({
            title: room ? `${room.title} 새 메시지` : `${lastMessage.senderNickname}님의 새 메시지`,
            body: lastMessage.content,
            roomId,
          });
        }
      })();
    });

    previousLastMessageRef.current = nextSnapshot;
  }, [lostRooms, messagesByRoom, rooms, session]);

  const openExternalRoomWindow = async (roomId: string) => {
    setUnreadByRoom((current) => {
      if (!(roomId in current)) return current;
      const next = { ...current };
      delete next[roomId];
      return next;
    });
    await loadRoomMessages(roomId);
    const opened = await window.coconutDesktop?.roomWindow.open(roomId);
    if (!opened && typeof window !== 'undefined') {
      window.open(`${window.location.origin}${window.location.pathname}?view=room&roomId=${encodeURIComponent(roomId)}`, '_blank', 'popup,width=720,height=760');
    }
  };

  const completeRoomOpen = async (roomId: string) => {
    await openExternalRoomWindow(roomId);
  };

  const openRoom = async (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) {
      await completeRoomOpen(roomId);
      return;
    }

    if (lostRooms.some((item) => item.id === roomId)) {
      await completeRoomOpen(roomId);
      return;
    }

    const isMember = !!session && room.participantIds.includes(session.clientId);
    if (room.type === 'private' && room.hasPassword && !isMember) {
      setPasswordTargetRoom(room);
      return;
    }

    const joinedRoom = await joinRoom(roomId);
    if (joinedRoom) {
      await completeRoomOpen(roomId);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    const success = await leaveRoom(roomId);
    if (success) {
      setUnreadByRoom((current) => {
        if (!(roomId in current)) return current;
        const next = { ...current };
        delete next[roomId];
        return next;
      });
    }
  };

  const handleStartDirectChat = async (userId: string) => {
    if (!session) return;

    const existingRoom = rooms.find(
      (room) => room.participantIds.length === 2 && room.participantIds.includes(session.clientId) && room.participantIds.includes(userId),
    );
    if (existingRoom) {
      await openRoom(existingRoom.id);
      return;
    }

    const targetUser = users.find((user) => user.clientId === userId);
    const newRoom = await createRoom({
      title: `${targetUser?.nickname ?? '새 친구'}와의 1:1 대화`,
      description: '접속자 목록에서 바로 시작한 1:1 대화방이에요.',
      type: 'public',
      invitedUserIds: [userId],
    });

    if (newRoom) {
      await openRoom(newRoom.id);
    }
  };

  if (!hydrated) {
    return null;
  }

  if (!session) {
    return (
      <>
        <LoginPopup onLogin={login} connectionState={connectionState} initialServerUrl={serverUrl} />
        <ToastLayer />
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-tropical p-5 lg:p-7">
      <ToastLayer />
      <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)] gap-6">
        <div className="min-h-0 overflow-hidden">
          <Sidebar active={activeNav} onChange={setActiveNav} session={session} connectionState={connectionState} onLogout={() => setShowLogoutConfirm(true)} />
        </div>

        <main className="min-h-0 min-w-0 overflow-hidden">
          <div className="h-full overflow-auto">
            {activeNav === 'lounge' && (
              <LoungePage
                session={session}
                rooms={rooms}
                users={users}
                announcements={announcements}
                feed={feed}
                onOpenRoom={(roomId) => void openRoom(roomId)}
              />
            )}
            {activeNav === 'users' && <UsersPage users={users} onStartDirectChat={(userId) => void handleStartDirectChat(userId)} />}
            {activeNav === 'rooms' && (
              <RoomsPage
                rooms={rooms}
                lostRooms={lostRooms}
                users={users}
                session={session}
                unreadByRoom={unreadByRoom}
                onCreateRoom={() => setShowCreateRoom(true)}
                onEnterRoom={(roomId) => void openRoom(roomId)}
                onLeaveRoom={(roomId) => void handleLeaveRoom(roomId)}
              />
            )}
          </div>
        </main>
      </div>

      {showCreateRoom && (
        <CreateRoomModal
          users={users.filter((user) => user.clientId !== session.clientId)}
          onClose={() => setShowCreateRoom(false)}
          onCreate={(payload) =>
            void createRoom(payload).then((room) => {
              setShowCreateRoom(false);
              if (room) void openRoom(room.id);
            })
          }
        />
      )}
      {passwordTargetRoom && (
        <PrivateRoomPasswordModal
          room={passwordTargetRoom}
          onClose={() => setPasswordTargetRoom(null)}
          onConfirm={async (password) => {
            const joinedRoom = await joinRoom(passwordTargetRoom.id, password);
            if (joinedRoom) {
              setPasswordTargetRoom(null);
              await completeRoomOpen(joinedRoom.id);
            }
          }}
        />
      )}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            setActiveNav('lounge');
            setUnreadByRoom({});
            logout();
          }}
        />
      )}
    </div>
  );
}

function RoomWindowShell({ roomId }: { roomId: string }) {
  const hydrated = useChatStore((state) => state.hydrated);
  const session = useChatStore((state) => state.session);
  const connectionState = useChatStore((state) => state.connectionState);
  const users = useChatStore((state) => state.users);
  const rooms = useChatStore((state) => state.rooms);
  const lostRooms = useChatStore((state) => state.lostRooms);
  const messagesByRoom = useChatStore((state) => state.messagesByRoom);
  const typingByRoom = useChatStore((state) => state.typingByRoom);
  const initializeSession = useChatStore((state) => state.initializeSession);
  const loadRoomMessages = useChatStore((state) => state.loadRoomMessages);
  const joinRoom = useChatStore((state) => state.joinRoom);
  const leaveRoom = useChatStore((state) => state.leaveRoom);
  const inviteUsers = useChatStore((state) => state.inviteUsers);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setTyping = useChatStore((state) => state.setTyping);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const joinedRoomRef = useRef<string | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? lostRooms.find((item) => item.id === roomId) ?? null, [lostRooms, roomId, rooms]);
  const isLost = lostRooms.some((item) => item.id === roomId);
  const messages = messagesByRoom[roomId] ?? [];

  useEffect(() => {
    if (!hydrated) return;
    initializeSession();
  }, [hydrated, initializeSession]);

  useEffect(() => {
    void loadRoomMessages(roomId);
  }, [loadRoomMessages, roomId]);

  useEffect(() => {
    if (!session || isLost) return;
    if (joinedRoomRef.current === roomId) return;

    joinedRoomRef.current = roomId;
    void joinRoom(roomId);
  }, [isLost, joinRoom, roomId, session]);

  if (!hydrated || !session) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-tropical p-3">
      <RoomDetailPage
        room={room}
        isLost={isLost}
        users={users}
        messages={messages}
        session={session}
        connectionState={connectionState}
        typing={typingByRoom[roomId] ?? []}
        onClose={() => void window.coconutDesktop?.roomWindow.closeCurrent()}
        onMinimize={() => void window.coconutDesktop?.roomWindow.minimizeCurrent()}
        onStartDrag={(_event: ReactMouseEvent<HTMLDivElement>) => {}}
        onInvite={() => setShowInviteModal(true)}
        onLeaveRoom={() =>
          void leaveRoom(roomId).then((success) => {
            if (success) {
              void window.coconutDesktop?.roomWindow.closeCurrent();
            }
          })
        }
        onSendMessage={(content) => sendMessage(roomId, content)}
        onTypingChange={(isTyping) => setTyping(roomId, isTyping)}
      />

      {showInviteModal && room && !isLost && (
        <InviteUsersModal
          users={users.filter((user) => user.clientId !== session.clientId)}
          existingUserIds={room.participantIds}
          onClose={() => setShowInviteModal(false)}
          onInvite={(userIds) => void inviteUsers({ roomId, userIds }).then(() => setShowInviteModal(false))}
        />
      )}
      <ToastLayer />
    </div>
  );
}

export default function App() {
  const { isRoomWindow, roomId } = readWindowMode();

  if (isRoomWindow && roomId) {
    return <RoomWindowShell roomId={roomId} />;
  }

  return <MainShell />;
}
