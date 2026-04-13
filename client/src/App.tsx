import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LoginPopup } from './components/LoginPopup';
import { MinusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Sidebar } from './components/layout/Sidebar';
import { CreateRoomModal } from './components/modals/CreateRoomModal';
import { InviteUsersModal } from './components/modals/InviteUsersModal';
import { LogoutConfirmModal } from './components/modals/LogoutConfirmModal';
import { PrivateRoomPasswordModal } from './components/modals/PrivateRoomPasswordModal';
import { DesktopNotificationPopup } from './components/ui/DesktopNotificationPopup';
import { ToastLayer } from './components/ui/ToastLayer';
import { LoungePage } from './pages/LoungePage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { RoomsPage } from './pages/RoomsPage';
import { UsersPage } from './pages/UsersPage';
import { useChatStore } from './store/useAppStore';
import { AppRoom, NavItem } from './types';

const readWindowMode = () => {
  if (typeof window === 'undefined') {
    return { mode: 'main' as const, roomId: null as string | null, notificationId: null as string | null, title: '', body: '', popupRoomId: null as string | null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const view = searchParams.get('view');
  if (view === 'room') {
    return {
      mode: 'room' as const,
      roomId: searchParams.get('roomId'),
      notificationId: null,
      title: '',
      body: '',
      popupRoomId: null,
    };
  }

  if (view === 'notification') {
    return {
      mode: 'notification' as const,
      roomId: null,
      notificationId: searchParams.get('notificationId'),
      title: searchParams.get('title') ?? '',
      body: searchParams.get('body') ?? '',
      popupRoomId: searchParams.get('roomId'),
    };
  }

  return {
    mode: 'main' as const,
    roomId: null,
    notificationId: null,
    title: '',
    body: '',
    popupRoomId: null,
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

  const [activeNav, setActiveNav] = useState<NavItem>('users');
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [passwordTargetRoom, setPasswordTargetRoom] = useState<AppRoom | null>(null);
  const [mainWindowOpacity, setMainWindowOpacity] = useState(1);

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
    if (!session) {
      setMainWindowOpacity(1);
      return;
    }

    let cancelled = false;
    void window.coconutDesktop?.appWindow.getCurrentOpacity().then((opacity) => {
      if (!cancelled && typeof opacity === 'number') {
        setMainWindowOpacity(opacity);
      }
    });

    return () => {
      cancelled = true;
    };
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
            body: lastMessage.messageType === 'image' ? '사진을 보냈습니다.' : lastMessage.content,
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
    const desktopRoomWindow = window.coconutDesktop?.roomWindow;
    if (desktopRoomWindow) {
      console.log('[renderer] opening electron room window', roomId);
      await desktopRoomWindow.open(roomId);
      return;
    }
    if (typeof window !== 'undefined') {
      console.log('[renderer] opening browser popup fallback', roomId);
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

    if (room.type === 'private' && room.hasPassword) {
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
    <div className="relative h-screen overflow-hidden bg-tropical p-[10px]">
      <div className="app-no-drag absolute left-1/2 top-2 z-20 -translate-x-1/2">
        <div className="app-drag h-2 w-[480px] max-w-full rounded-full bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]" title="여기를 잡고 창을 이동할 수 있어요" />
      </div>
      <div className="app-no-drag absolute right-5 top-4 z-20 flex items-center gap-2">
        <button type="button" aria-label="최소화" onClick={() => void window.coconutDesktop?.appWindow.minimizeCurrent()} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7bea4] bg-[linear-gradient(180deg,#fff7ee_0%,#f0decb_100%)] text-[#5d3f30] shadow-[0_6px_16px_rgba(84,56,38,0.14)] transition hover:bg-[linear-gradient(180deg,#fffaf4_0%,#f3e5d5_100%)]">
          <MinusIcon className="h-4 w-4" />
        </button>
        <button type="button" aria-label="닫기" onClick={() => void window.coconutDesktop?.appWindow.closeCurrent()} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7bea4] bg-[linear-gradient(180deg,#fff7ee_0%,#f0decb_100%)] text-[#5d3f30] shadow-[0_6px_16px_rgba(84,56,38,0.14)] transition hover:bg-[linear-gradient(180deg,#fffaf4_0%,#f3e5d5_100%)]">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <ToastLayer />
      <div className="grid h-full min-h-0 grid-cols-[154px_minmax(0,1fr)] gap-[10px]">
        <div className="min-h-0 overflow-hidden">
          <Sidebar
            active={activeNav}
            onChange={setActiveNav}
            session={session}
            connectionState={connectionState}
            windowOpacity={mainWindowOpacity}
            onOpacityChange={(opacity) => {
              void window.coconutDesktop?.appWindow.setCurrentOpacity(opacity).then((nextOpacity) => {
                setMainWindowOpacity(nextOpacity);
              });
            }}
            onLogout={() => setShowLogoutConfirm(true)}
          />
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
            setActiveNav('users');
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
  const [windowOpacity, setWindowOpacity] = useState(1);
  const [bridgeStatus, setBridgeStatus] = useState('브리지 확인 중');
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
    if (!session || isLost || (room?.type === 'private' && room.hasPassword)) return;
    if (joinedRoomRef.current === roomId) return;

    joinedRoomRef.current = roomId;
    void joinRoom(roomId);
  }, [isLost, joinRoom, roomId, session]);

  useEffect(() => {
    let cancelled = false;
    const roomWindowBridge = window.coconutDesktop?.roomWindow;

    if (!roomWindowBridge) {
      setBridgeStatus('브리지 없음');
      return () => {
        cancelled = true;
      };
    }

    setBridgeStatus('브리지 연결됨');

    void roomWindowBridge.getCurrentOpacity().then((opacity) => {
      if (!cancelled && typeof opacity === 'number') {
        setWindowOpacity(opacity);
        setBridgeStatus(`브리지 연결됨, 현재 투명도 ${Math.round(opacity * 100)}%`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (!hydrated || !session) {
    return null;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      <RoomDetailPage
        room={room}
        isLost={isLost}
        users={users}
        messages={messages}
        session={session}
        connectionState={connectionState}
        windowOpacity={windowOpacity}
        bridgeStatus={bridgeStatus}
        typing={typingByRoom[roomId] ?? []}
        onClose={async () => {
          const roomWindowBridge = window.coconutDesktop?.roomWindow;
          if (!roomWindowBridge) {
            setBridgeStatus('닫기 실패: 브리지 없음');
            return;
          }

          setBridgeStatus('닫기 요청 보냄');
          const result = await roomWindowBridge.closeCurrent();
          setBridgeStatus(`닫기 응답: ${result ? '성공' : '실패'}`);
        }}
        onMinimize={async () => {
          const roomWindowBridge = window.coconutDesktop?.roomWindow;
          if (!roomWindowBridge) {
            setBridgeStatus('최소화 실패: 브리지 없음');
            return;
          }

          setBridgeStatus('최소화 요청 보냄');
          const result = await roomWindowBridge.minimizeCurrent();
          setBridgeStatus(`최소화 응답: ${result ? '성공' : '실패'}`);
        }}
        onOpacityChange={(opacity) => {
          const roomWindowBridge = window.coconutDesktop?.roomWindow;
          if (!roomWindowBridge) {
            setBridgeStatus('투명도 변경 실패: 브리지 없음');
            return;
          }

          setBridgeStatus(`투명도 요청 보냄: ${Math.round(opacity * 100)}%`);
          void roomWindowBridge.setCurrentOpacity(opacity).then((nextOpacity) => {
            setWindowOpacity(nextOpacity);
            setBridgeStatus(`투명도 응답: ${Math.round(nextOpacity * 100)}%`);
          });
        }}
        onInvite={() => setShowInviteModal(true)}
        onSendMessage={(payload) => sendMessage(roomId, payload)}
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
  const { mode, roomId, notificationId, title, body, popupRoomId } = readWindowMode();

  if (mode === 'room' && roomId) {
    return <RoomWindowShell roomId={roomId} />;
  }

  if (mode === 'notification' && notificationId) {
    return <DesktopNotificationPopup notificationId={notificationId} title={title} body={body} roomId={popupRoomId} />;
  }

  return <MainShell />;
}
