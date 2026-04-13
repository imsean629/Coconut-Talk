import { ArrowLeftStartOnRectangleIcon, ChatBubbleBottomCenterTextIcon, SignalIcon } from '@heroicons/react/24/outline';
import { ChangeEvent } from 'react';
import clsx from 'clsx';
import { AppConnectionState, NavItem, SessionProfile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';

const items: { id: NavItem; label: string; icon: typeof SignalIcon }[] = [
  { id: 'users', label: '접속자 목록', icon: SignalIcon },
  { id: 'rooms', label: '대화방', icon: ChatBubbleBottomCenterTextIcon },
];

const statusLabel: Record<AppConnectionState, string> = {
  connecting: '연결 중',
  connected: '연결됨',
  disconnected: '끊김',
};

const statusTone: Record<AppConnectionState, string> = {
  connecting: 'bg-[#fff0df] text-coconut-shell',
  connected: 'bg-[#e6f2dc] text-coconut-leaf',
  disconnected: 'bg-[#ffe8ee] text-rose-700',
};

export function Sidebar({
  active,
  onChange,
  session,
  connectionState,
  windowOpacity,
  onOpacityChange,
  onLogout,
}: {
  active: NavItem;
  onChange: (item: NavItem) => void;
  session: SessionProfile;
  connectionState: AppConnectionState;
  windowOpacity: number;
  onOpacityChange: (opacity: number) => void;
  onLogout: () => void;
}) {
  const handleOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOpacityChange(Number(event.target.value));
  };

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[24px] border border-white/70 bg-white/80 p-2.5 shadow-soft backdrop-blur-md">
      <BrandMark compact />
      <div className={`mt-2.5 inline-flex w-fit max-w-full rounded-full px-2 py-1 text-[9px] font-semibold ${statusTone[connectionState]}`}>{statusLabel[connectionState]}</div>
      <div className="mt-3 flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-[#fff1df] to-[#fff0f4] p-2 ring-1 ring-[#f0deca]">
        <Avatar name={session.nickname} color={session.color} seed={session.avatarSeed} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-coconut-ink">{session.nickname}</p>
        </div>
      </div>
      <nav className="mt-4 flex flex-1 flex-col gap-1.5">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={clsx(
              'flex w-full items-center gap-2 rounded-[16px] px-2.5 py-2.5 text-left transition',
              active === id ? 'bg-gradient-to-r from-coconut-shell to-coconut-bark text-white shadow-soft' : 'text-coconut-shell hover:-translate-y-0.5 hover:bg-[#fff2e4]',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-tight">{label}</span>
          </button>
        ))}
      </nav>
      <label className="mb-2 flex flex-col gap-1 rounded-[16px] border border-[#eed8c0] bg-[#fff8f1] px-2.5 py-2 text-coconut-shell">
        <span className="text-[10px] font-semibold leading-tight">투명도 {Math.round(windowOpacity * 100)}%</span>
        <input type="range" min="0.45" max="1" step="0.05" value={windowOpacity} onChange={handleOpacityChange} className="w-full cursor-pointer accent-[#9e8269]" />
      </label>
      <button
        type="button"
        onClick={onLogout}
        className="mt-2.5 flex w-full items-center gap-2 rounded-[16px] border border-[#eed8c0] bg-[#fff8f1] px-2.5 py-2.5 text-coconut-shell transition hover:-translate-y-0.5 hover:bg-[#fff0e0]"
      >
        <ArrowLeftStartOnRectangleIcon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-tight">로그아웃</span>
      </button>
    </aside>
  );
}
