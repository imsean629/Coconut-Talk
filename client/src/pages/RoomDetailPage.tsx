import { ExclamationTriangleIcon, MinusIcon, PaperAirplaneIcon, PhotoIcon, PlusIcon, SignalIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ChangeEvent, ClipboardEvent, FormEvent, MouseEvent as ReactMouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  windowOpacity,
  bridgeStatus,
  typing,
  onClose,
  onMinimize,
  onInvite,
  onSendMessage,
  onTypingChange,
  onOpacityChange,
}: {
  room: AppRoom | LostRoom | null;
  isLost: boolean;
  users: AppUser[];
  messages: LocalMessage[];
  session: SessionProfile;
  connectionState: AppConnectionState;
  windowOpacity: number;
  bridgeStatus: string;
  typing: AppTypingState[];
  onClose: () => void;
  onMinimize: () => void;
  onInvite: () => void;
  onSendMessage: (payload: { content?: string; imageData?: string }) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
  onOpacityChange: (opacity: number) => void;
}) {
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const participants = useMemo(() => users.filter((user) => room?.participantIds.includes(user.clientId)), [room?.participantIds, users]);
  const opacityPercent = Math.round(windowOpacity * 100);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, room?.id]);

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

  useEffect(() => {
    if (!expandedImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage]);

  if (!room) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!draft.trim() && !pendingImage) || isLost) return;

    const content = draft;
    const imageData = pendingImage;
    setDraft('');
    setPendingImage(null);
    await onSendMessage({ content, imageData: imageData ?? undefined });
  };

  const handleOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOpacityChange(Number(event.target.value));
  };

  const handlePaste = async (event: ClipboardEvent<HTMLInputElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const closeExpandedImage = () => setExpandedImage(null);

  const stopImageOverlayClose = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-white/80 bg-[#fffaf3] shadow-float">
      <div className="app-no-drag absolute left-1/2 top-2 z-20 -translate-x-1/2">
        <div className="app-drag h-2 w-[480px] max-w-full rounded-full bg-[#e9d8c4]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" title="여기를 잡고 창을 이동할 수 있어요" />
      </div>

      <div className="flex items-start justify-between gap-4 border-b border-[#efd8bf] bg-white/70 px-4 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-coconut-ink">{room.title}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${room.type === 'public' ? 'bg-[#e6f2dc] text-coconut-shell' : 'bg-coconut-shell text-white'}`}>
              {room.type === 'public' ? '공개방' : '비공개방'}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${connectionState === 'connected' ? 'bg-[#e6f2dc] text-coconut-leaf' : connectionState === 'connecting' ? 'bg-[#fff0df] text-coconut-shell' : 'bg-[#ffe8ee] text-rose-700'}`}>
              {connectionState === 'connected' ? '연결됨' : connectionState === 'connecting' ? '연결 중' : '오프라인'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-coconut-shell/70">{room.description || '접속자 목록에서 바로 시작한 대화방이에요.'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-coconut-shell/72">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1df] px-2 py-1">
              <UserGroupIcon className="h-3 w-3" />
              {room.participantIds.length}명
            </span>
            {participants.map((participant) => (
              <span key={participant.clientId} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-[#efd8bf]">
                <Avatar name={participant.nickname} color={participant.color} seed={participant.avatarSeed} size="xs" />
                <span>{participant.nickname}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="app-no-drag flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {!isLost && (
              <button type="button" className="flex items-center gap-1.5 rounded-[16px] border border-[#efd8bf] bg-white px-3 py-1.5 text-xs font-medium text-coconut-shell transition hover:bg-[#fff0e0]" onClick={onInvite}>
                <PlusIcon className="h-3.5 w-3.5" />
                초대
              </button>
            )}
            <button type="button" aria-label="최소화" className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#d7bea4] bg-[linear-gradient(180deg,#fff7ee_0%,#f0decb_100%)] text-[#5d3f30] shadow-[0_6px_16px_rgba(84,56,38,0.12)] transition hover:bg-[linear-gradient(180deg,#fffaf4_0%,#f3e5d5_100%)]" onClick={onMinimize}>
              <MinusIcon className="h-4 w-4" />
            </button>
            <button type="button" aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#d7bea4] bg-[linear-gradient(180deg,#fff7ee_0%,#f0decb_100%)] text-[#5d3f30] shadow-[0_6px_16px_rgba(84,56,38,0.12)] transition hover:bg-[linear-gradient(180deg,#fffaf4_0%,#f3e5d5_100%)]" onClick={onClose}>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <label className="flex items-center gap-2 rounded-full border border-[#efd8bf] bg-white/92 px-3 py-1.5 text-[11px] text-coconut-shell shadow-sm">
            <span className="whitespace-nowrap font-medium">투명도 {opacityPercent}%</span>
            <input type="range" min="0.45" max="1" step="0.05" value={windowOpacity} onChange={handleOpacityChange} className="w-24 cursor-pointer accent-[#9e8269]" />
          </label>
        </div>
      </div>

      <div className="app-no-drag border-b border-[#f3e4d2] bg-[#fffaf5] px-4 py-2 text-[11px] text-coconut-shell/75">브리지 상태: {bridgeStatus}</div>

      {isLost && (
        <div className="mx-4 mt-3 flex items-start gap-3 rounded-[18px] border border-[#f2d3da] bg-[#fff1f4] px-4 py-3 text-sm text-rose-700">
          <ExclamationTriangleIcon className="mt-0.5 h-4.5 w-4.5" />
          <div>
            <p className="font-semibold">이 방은 서버 재시작으로 사라졌어요.</p>
            <p className="mt-1 text-xs">기존 대화 기록은 보이지만 새 메시지는 보낼 수 없어요.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2.5">
          {messages.map((message) => {
            const sender = users.find((user) => user.clientId === message.senderId);
            const isMe = message.senderId === session.clientId;

            return (
              <div key={message.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && <Avatar name={message.senderNickname} color={message.senderColor} seed={message.senderAvatarSeed} size="xs" />}
                <div className={`flex max-w-[78%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="mb-1 flex items-center gap-2 px-1 text-[10px] text-coconut-shell/60">
                    <span>{sender?.nickname ?? message.senderNickname}</span>
                    <span>{formatTime(message.createdAt)}</span>
                    {isMe && <span className={message.status === 'failed' ? 'text-rose-600' : message.status === 'sending' ? 'text-amber-600' : 'text-coconut-shell/60'}>{statusLabel[message.status]}</span>}
                  </div>
                  <div className={`rounded-[16px] px-3 py-2 text-[11px] leading-[1.45] shadow-sm ${isMe ? 'bg-gradient-to-r from-coconut-shell to-coconut-bark text-white' : 'bg-[#fff7ee] text-coconut-ink'}`}>
                    {message.messageType === 'image' && message.imageData && (
                      <button
                        type="button"
                        onClick={() => setExpandedImage(message.imageData ?? null)}
                        className="block overflow-hidden rounded-[12px] bg-white/30 transition hover:scale-[1.01] hover:shadow-md"
                      >
                        <img src={message.imageData} alt="전송된 이미지" className="max-h-[180px] rounded-[12px] object-contain" />
                      </button>
                    )}
                    {message.messageType === 'image' && message.content && <p className="mt-2 whitespace-pre-wrap">{message.content}</p>}
                    {message.messageType !== 'image' && <p className="whitespace-pre-wrap">{message.content}</p>}
                  </div>
                  {message.error && isMe && <p className="mt-1 px-1 text-[10px] text-rose-600">{message.error}</p>}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>

      {typing.length > 0 && (
        <div className="px-4 pb-2 text-[11px] text-coconut-shell/70">
          <div className="flex items-center gap-1.5">
            <SignalIcon className="h-3.5 w-3.5" />
            <span>{typing.map((item) => item.nickname).join(', ')}님이 입력 중이에요...</span>
          </div>
        </div>
      )}

      {pendingImage && (
        <div className="mx-4 mb-2 rounded-[18px] border border-[#efd8bf] bg-[#fff7ee] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-coconut-shell">
              <PhotoIcon className="h-4 w-4" />
              붙여넣은 이미지 미리보기
            </div>
            <button type="button" onClick={() => setPendingImage(null)} className="rounded-full border border-[#e3ccb3] px-2 py-1 text-[11px] text-coconut-shell transition hover:bg-white">
              제거
            </button>
          </div>
          <img src={pendingImage} alt="붙여넣기 미리보기" className="max-h-[140px] rounded-[14px] object-contain bg-white" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="m-4 mt-2 flex items-center gap-2 rounded-[20px] border border-[#efd8bf] bg-[#fffaf5] p-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={handlePaste}
          placeholder={isLost ? '사라진 방에서는 새 메시지를 보낼 수 없어요.' : connectionState === 'connected' ? '메시지를 입력하거나 이미지를 붙여넣어보세요.' : '연결이 복구되면 메시지를 보낼 수 있어요.'}
          disabled={isLost || connectionState !== 'connected'}
          className="flex-1 bg-transparent px-3 py-1 text-sm outline-none disabled:cursor-not-allowed"
        />
        <button type="submit" disabled={(!draft.trim() && !pendingImage) || isLost || connectionState !== 'connected'} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-coconut-shell to-coconut-bark text-white transition hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50">
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </form>

      {expandedImage && (
        <div className="app-no-drag absolute inset-0 z-40 flex items-center justify-center bg-[#2f1f17]/78 p-6 backdrop-blur-sm" onClick={closeExpandedImage}>
          <div className="relative flex max-h-full w-full max-w-4xl items-center justify-center" onClick={stopImageOverlayClose}>
            <button
              type="button"
              onClick={closeExpandedImage}
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#fff8f1]/90 text-coconut-shell shadow-lg transition hover:bg-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <img src={expandedImage} alt="확대된 이미지" className="max-h-[82vh] w-auto max-w-full rounded-[24px] border border-white/20 bg-white/95 object-contain shadow-[0_20px_60px_rgba(0,0,0,0.3)]" />
          </div>
        </div>
      )}
    </div>
  );
}
