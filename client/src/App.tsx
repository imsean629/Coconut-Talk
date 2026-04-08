import { useEffect, useMemo, useState } from 'react';
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

export default function App() {
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
  const typingByRoom = useChatStore((state) => state.typingByRoom);
  const initializeSession = useChatStore((state) => state.initializeSession);
  const login = useChatStore((state) => state.login);
  const logout = useChatStore((state) => state.logout);
  const loadRoomMessages = useChatStore((state) => state.loadRoomMessages);
  const joinRoom = useChatStore((state) => state.joinRoom);
  const leaveRoom = useChatStore((state) => state.leaveRoom);
  const createRoom = useChatStore((state) => state.createRoom);
  const inviteUsers = useChatStore((state) => state.inviteUsers);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setTyping = useChatStore((state) => state.setTyping);

  const [activeNav, setActiveNav] = useState<NavItem>('lounge');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [passwordTargetRoom, setPasswordTargetRoom] = useState<AppRoom | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? lostRooms.find((room) => room.id === selectedRoomId) ?? null,
    [lostRooms, rooms, selectedRoomId],
  );
  const selectedMessages = selectedRoomId ? messagesByRoom[selectedRoomId] ?? [] : [];
  const isLostRoom = selectedRoomId ? lostRooms.some((room) => room.id === selectedRoomId) : false;

  useEffect(() => {
    if (!hydrated) return;
    initializeSession();
  }, [hydrated, initializeSession]);

  useEffect(() => {
    window.coconutDesktop?.setWindowMode(session ? 'main' : 'login');
  }, [session]);

  useEffect(() => {
    if (selectedRoomId) {
      void loadRoomMessages(selectedRoomId);
    }
  }, [loadRoomMessages, selectedRoomId]);

  const completeRoomOpen = async (roomId: string) => {
    setSelectedRoomId(roomId);
    await loadRoomMessages(roomId);
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
    if (success && selectedRoomId === roomId) {
      setSelectedRoomId(null);
      setShowInviteModal(false);
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

  const inviteCandidates = users.filter((user) => user.clientId !== session.clientId);

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
            {activeNav === 'users' && (
              <UsersPage
                users={users}
                onInviteToRoom={(userId) =>
                  void createRoom({
                    title: `${users.find((user) => user.clientId === userId)?.nickname ?? '새'} 만남`,
                    description: '접속자 목록에서 바로 시작한 실시간 대화방이에요.',
                    type: 'public',
                    invitedUserIds: [userId],
                  }).then((room) => room && void openRoom(room.id))
                }
              />
            )}
            {activeNav === 'rooms' && (
              <RoomsPage
                rooms={rooms}
                lostRooms={lostRooms}
                users={users}
                session={session}
                onCreateRoom={() => setShowCreateRoom(true)}
                onEnterRoom={(roomId) => void openRoom(roomId)}
                onLeaveRoom={(roomId) => void handleLeaveRoom(roomId)}
              />
            )}
          </div>
        </main>
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#3d2a22]/28 px-5 py-6 backdrop-blur-sm">
          <RoomDetailPage
            room={selectedRoom}
            isLost={isLostRoom}
            users={users}
            messages={selectedMessages}
            session={session}
            connectionState={connectionState}
            typing={typingByRoom[selectedRoomId!] ?? []}
            onBackToRooms={() => setSelectedRoomId(null)}
            onInvite={() => setShowInviteModal(true)}
            onLeaveRoom={() => void handleLeaveRoom(selectedRoom.id)}
            onSendMessage={(content) => sendMessage(selectedRoomId!, content)}
            onTypingChange={(isTyping) => setTyping(selectedRoomId!, isTyping)}
          />
        </div>
      )}

      {showCreateRoom && (
        <CreateRoomModal
          users={inviteCandidates}
          onClose={() => setShowCreateRoom(false)}
          onCreate={(payload) =>
            void createRoom(payload).then((room) => {
              setShowCreateRoom(false);
              if (room) void openRoom(room.id);
            })
          }
        />
      )}
      {showInviteModal && selectedRoom && !isLostRoom && (
        <InviteUsersModal
          users={inviteCandidates}
          existingUserIds={selectedRoom.participantIds}
          onClose={() => setShowInviteModal(false)}
          onInvite={(userIds) => void inviteUsers({ roomId: selectedRoom.id, userIds }).then(() => setShowInviteModal(false))}
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
            setSelectedRoomId(null);
            setActiveNav('lounge');
            logout();
          }}
        />
      )}
    </div>
  );
}


