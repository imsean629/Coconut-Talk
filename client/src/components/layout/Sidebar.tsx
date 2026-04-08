import { ArrowLeftStartOnRectangleIcon, ChatBubbleBottomCenterTextIcon, HomeIcon, SignalIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { BrandMark } from '../ui/BrandMark';
import { Avatar } from '../ui/Avatar';
import { AppConnectionState, NavItem, SessionProfile } from '../../types';

const items: { id: NavItem; label: string; icon: typeof HomeIcon }[] = [
  { id: 'lounge', label: '라운지', icon: HomeIcon },
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
  onLogout,
}: {
  active: NavItem;
  onChange: (item: NavItem) => void;
  session: SessionProfile;
  connectionState: AppConnectionState;
  onLogout: () => void;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/70 bg-white/80 p-3 shadow-soft backdrop-blur-md">
      <BrandMark compact />
      <div className={`mt-3 inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone[connectionState]}`}>{statusLabel[connectionState]}</div>
      <div className="mt-4 flex items-center gap-2 rounded-[22px] bg-gradient-to-r from-[#fff1df] to-[#fff0f4] p-2.5 ring-1 ring-[#f0deca]">
        <Avatar name={session.nickname} color={session.color} seed={session.avatarSeed} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-coconut-ink">{session.nickname}</p>
          <p className="truncate text-[10px] text-coconut-shell/75">코코넛 라운지 접속 중</p>
        </div>
      </div>
      <nav className="mt-5 flex flex-1 flex-col gap-2">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={clsx(
              'flex w-full items-center gap-2.5 rounded-[20px] px-3 py-3 text-left transition',
              active === id ? 'bg-gradient-to-r from-coconut-shell to-coconut-bark text-white shadow-soft' : 'text-coconut-shell hover:-translate-y-0.5 hover:bg-[#fff2e4]',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </nav>
      <button type="button" onClick={onLogout} className="mt-3 flex w-full items-center gap-2.5 rounded-[20px] border border-[#eed8c0] bg-[#fff8f1] px-3 py-3 text-coconut-shell transition hover:-translate-y-0.5 hover:bg-[#fff0e0]">
        <ArrowLeftStartOnRectangleIcon className="h-[18px] w-[18px] shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none">로그아웃</span>
      </button>
    </aside>
  );
}
