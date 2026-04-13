import { PlusIcon } from '@heroicons/react/24/outline';
import { Avatar } from '../components/ui/Avatar';
import { Panel } from '../components/ui/Panel';
import { AppUser } from '../types';

export function UsersPage({ users, onStartDirectChat }: { users: AppUser[]; onStartDirectChat: (userId: string) => void }) {
  const onlineUsers = users.filter((user) => user.online);

  return (
    <div className="min-h-full space-y-4">
      <Panel>
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-coconut-ink">접속자 목록</h1>
          <p className="text-sm text-coconut-shell/75">현재 접속 중인 사람만 보여줘요.</p>
        </div>

        <div className="mb-4 rounded-[24px] bg-gradient-to-br from-coconut-shell to-coconut-bark px-4 py-4 text-white">
          <p className="text-sm text-white/70">현재 접속 중 인원</p>
          <p className="mt-2 text-3xl font-semibold">{onlineUsers.length}</p>
        </div>

        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div key={user.clientId} className="flex items-center justify-between gap-2.5 rounded-[16px] border border-[#efdcc8] bg-[#fffaf5] px-3 py-2">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="relative">
                  <Avatar name={user.nickname} color={user.color} seed={user.avatarSeed} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                <p className="truncate text-[13px] font-semibold text-coconut-ink">{user.nickname}</p>
              </div>

              <button
                type="button"
                onClick={() => onStartDirectChat(user.clientId)}
                className="shrink-0 flex items-center gap-1 rounded-[14px] bg-gradient-to-r from-coconut-shell to-coconut-bark px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                <PlusIcon className="h-3 w-3" />
                1:1 대화
              </button>
            </div>
          ))}

          {onlineUsers.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#efdcc8] bg-[#fffaf5] px-4 py-10 text-center text-sm text-coconut-shell/70">
              현재 접속 중인 사용자가 없어요.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
