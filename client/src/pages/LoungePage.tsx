import { Panel } from '../components/ui/Panel';
import { AppRoom, AppUser, SessionProfile } from '../types';
import { formatDateTime } from '../utils/format';

export function LoungePage({
  session,
  rooms,
  users,
  onOpenRoom,
}: {
  session: SessionProfile;
  rooms: AppRoom[];
  users: AppUser[];
  announcements: unknown[];
  feed: string[];
  onOpenRoom: (roomId: string) => void;
}) {
  const onlineUsers = users.filter((member) => member.online).length;
  const sortedRooms = [...rooms].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="min-h-full space-y-4">
      <Panel className="bg-gradient-to-br from-[#fff5e7] via-white to-[#fff0f4]">
        <p className="text-sm font-medium text-coconut-shell/80">커뮤니티 홈</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-coconut-ink md:text-3xl">{session.nickname}님, 다시 왔네요</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-coconut-shell/80">코코넛톡은 가볍게 인사하고, 편하게 이야기를 이어갈 수 있는 데스크톱 메신저예요.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] bg-gradient-to-br from-coconut-shell to-coconut-bark px-4 py-4 text-white">
            <p className="text-sm text-white/70">현재 접속</p>
            <p className="mt-2 text-3xl font-semibold">{onlineUsers}</p>
          </div>
          <div className="rounded-[24px] bg-[#e8f3dc] px-4 py-4 ring-1 ring-[#d7e8c8]">
            <p className="text-sm text-coconut-shell/80">현재 열린 방</p>
            <p className="mt-2 text-3xl font-semibold text-coconut-ink">{rooms.length}</p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-coconut-ink">라운지</h2>
          <p className="text-sm text-coconut-shell/75">현재 서버에 열려 있는 방을 모두 볼 수 있어요.</p>
        </div>

        <div className="space-y-3">
          {sortedRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => onOpenRoom(room.id)}
              className="w-full rounded-[24px] border border-[#efdcc8] bg-[#fffaf5] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-coconut-palm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-coconut-ink">{room.title}</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${room.type === 'public' ? 'bg-[#e6f2dc] text-coconut-shell' : 'bg-coconut-shell text-white'}`}>
                      {room.type === 'public' ? '공개방' : '비공개방'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-coconut-shell/70">{room.description || '실시간으로 바로 대화할 수 있는 방이에요.'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-coconut-shell">{room.participantIds.length}명</span>
              </div>
              <div className="mt-3 text-xs text-coconut-shell/65">{formatDateTime(room.createdAt)}</div>
            </button>
          ))}

          {sortedRooms.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#efdcc8] bg-[#fffaf5] px-4 py-10 text-center text-sm text-coconut-shell/70">
              아직 열린 방이 없어요. 첫 대화방을 만들어보세요.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

