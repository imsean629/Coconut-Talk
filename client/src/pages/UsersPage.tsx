import { PlusIcon } from '@heroicons/react/24/outline';
import { Avatar } from '../components/ui/Avatar';
import { Panel } from '../components/ui/Panel';
import { AppUser } from '../types';

export function UsersPage({ users, onInviteToRoom }: { users: AppUser[]; onInviteToRoom: (userId: string) => void }) {
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

        <div className="space-y-3">
          {onlineUsers.map((user) => (
            <div key={user.clientId} className="flex flex-col gap-4 rounded-[24px] border border-[#efdcc8] bg-[#fffaf5] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={user.nickname} color={user.color} seed={user.avatarSeed} />
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-coconut-ink">{user.nickname}</p>
                  <p className="text-sm text-coconut-shell/75">실시간 접속 중</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onInviteToRoom(user.clientId)} className="flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-coconut-shell to-coconut-bark px-4 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-soft">
                  <PlusIcon className="h-4 w-4" />1:1 대화
                </button>
              </div>
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
