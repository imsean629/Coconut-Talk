import { ArrowRightOnRectangleIcon, ExclamationTriangleIcon, MinusIcon, PaperAirplaneIcon, PlusIcon, SignalIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { AppConnectionState, AppRoom, AppTypingState, AppUser, LocalMessage, LostRoom, SessionProfile } from '../types';
import { formatTime } from '../utils/format';

const statusLabel: Record<LocalMessage['status'], string> = {
  sending: '전송 중',
  sent: '전송됨',
  failed: '실패',
  received: '수신됨',
};

export function RoomDetailPage({
  room,
  isLost,
  users,
  messages,
  session,
  connectionState,
  typing,
  onClose,
  onMinimize,
  onStartDrag,
  onInvite,
  onLeaveRoom,
  onSendMessage,
  onTypingChange,
}: {
  room: AppRoom | LostRoom | null;
  isLost: boolean;
  users: AppUser[];
  messages: LocalMessage[];
  session: SessionProfile;
  connectionState: AppConnectionState;
  typing: AppTypingState[];
  onClose: () => void;
  onMinimize: () => void;
  onStartDrag: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onInvite: () => void;
  onLeaveRoom: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const participants = useMemo(() => users.filter((user) => room?.participantIds.includes(user.clientId)), [room?.participantIds, users]);

  useEffect(() => {
    if (!room) return;
    if (!draft.trim()) {
      onTypingChange(false);
      return;
    }
    onTypingChange(true);
    const timer = setTimeout(() => onTypingChange(false), 1200);
    return () => clearTimeout(timer);
  }, [draft, onTypingChange, room]);

  if (!room) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || isLost) return;
    const content = draft;
    setDraft('');
    await onSendMessage(content);
  };

  return (
    <div className="flex h-[560px] w-[620px] flex-col overflow-hidden rounded-[30px] border border-white/80 bg-[#fffaf3] shadow-float">
      <div onMouseDown={onStartDrag} className="flex cursor-move items-start justify-between gap-4 border-b border-[#efd8bf] bg-white/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-coconut-ink">{room.title}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${room.type === 'public' ? 'bg-[#e6f2dc] text-coconut-shell' : 'bg-coconut-shell text-white'}`}>{room.type === 'public' ? '공개방' : '비공개방'}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${connectionState === 'connected' ? 'bg-[#e6f2dc] text-coconut-leaf' : connectionState === 'connecting' ? 'bg-[#fff0df] text-coconut-shell' : 'bg-[#ffe8ee] text-rose-700'}`}>{connectionState === 'connected' ? '연결됨' : connectionState === 'connecting' ? '연결 중' : '끊김'}</span>
          </div>
          <p className="mt-1 text-[11px] text-coconut-shell/70">{room.description || '편하게 머물며 이야기할 수 있는 대화방이에요.'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-coconut-shell/72">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1df] px-2 py-1">
              <UserGroupIcon className="h-3 w-3" />{room.participantIds.length}명
            </span>
            {participants.map((participant) => (
              <span key={participant.clientId} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-[#efd8bf]">
                <Avatar name={participant.nickname} color={participant.color} seed={participant.avatarSeed} size="xs" />
                <span>{participant.nickname}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isLost && (
            <>
              <button type="button" onClick={onLeaveRoom} className="flex items-center gap-1.5 rounded-[16px] border border-[#efd8bf] bg-white px-3 py-1.5 text-xs font-medium text-coconut-shell transition hover:bg-[#fff0e0]">
                <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" />나가기
              </button>
              <button type="button" onClick={onInvite} disabled={connectionState !== 'connected'} className="flex items-center gap-1.5 rounded-[16px] border border-[#efd8bf] bg-white px-3 py-1.5 text-xs font-medium text-coconut-shell transition hover:bg-[#fff0e0] disabled:cursor-not-allowed disabled:opacity-50">
                <PlusIcon className="h-3.5 w-3.5" />초대
              </button>
            </>
          )}
          <button type="button" onClick={onMinimize} className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#efd8bf] bg-white text-coconut-shell transition hover:bg-[#fff0e0]">
            <MinusIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#efd8bf] bg-white text-coconut-shell transition hover:bg-[#fff0e0]">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLost && <div className="mx-4 mt-3 flex items-start gap-3 rounded-[18px] border border-[#f2d3da] bg-[#fff1f4] px-4 py-3 text-sm text-rose-700"><ExclamationTriangleIcon className="mt-0.5 h-4.5 w-4.5" /><div><p className="font-semibold">이 방은 서버 재시작으로 사라졌어요.</p><p className="mt-1 text-xs">내 기기에 저장된 기록은 계속 볼 수 있지만, 새 메시지는 보낼 수 없어요.</p></div></div>}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2.5">
          {messages.map((message) => {
            const sender = users.find((user) => user.clientId === message.senderId);
            const isMe = message.senderId === session.clientId;
            return (
              <div key={message.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && <Avatar name={message.senderNickname} color={message.senderColor} seed={message.senderAvatarSeed} size="xs" />}
                <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="mb-1 flex items-center gap-2 px-1 text-[10px] text-coconut-shell/60">
                    <span>{sender?.nickname ?? message.senderNickname}</span>
                    <span>{formatTime(message.createdAt)}</span>
                    {isMe && <span className={message.status === 'failed' ? 'text-rose-600' : message.status === 'sending' ? 'text-amber-600' : 'text-coconut-shell/60'}>{statusLabel[message.status]}</span>}
                  </div>
                  <div className={`rounded-[16px] px-3 py-1.5 text-[11px] leading-[1.45] shadow-sm ${isMe ? 'bg-gradient-to-r from-coconut-shell to-coconut-bark text-white' : 'bg-[#fff7ee] text-coconut-ink'}`}>
                    {message.content}
                  </div>
                  {message.error && isMe && <p className="mt-1 px-1 text-[10px] text-rose-600">{message.error}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {typing.length > 0 && <div className="px-4 pb-2 text-[11px] text-coconut-shell/70"><div className="flex items-center gap-1.5"><SignalIcon className="h-3.5 w-3.5" /><span>{typing.map((item) => item.nickname).join(', ')}님이 입력 중이에요...</span></div></div>}

      <form onSubmit={handleSubmit} className="m-4 mt-2 flex items-center gap-2 rounded-[20px] border border-[#efd8bf] bg-[#fffaf5] p-2">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={isLost ? '사라진 방에서는 새 메시지를 보낼 수 없어요' : connectionState === 'connected' ? '메시지를 입력해보세요' : '연결이 복구되면 메시지를 보낼 수 있어요'} disabled={isLost || connectionState !== 'connected'} className="flex-1 bg-transparent px-3 py-1 text-sm outline-none disabled:cursor-not-allowed" />
        <button type="submit" disabled={!draft.trim() || isLost || connectionState !== 'connected'} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-coconut-shell to-coconut-bark text-white transition hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50"><PaperAirplaneIcon className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
