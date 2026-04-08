import { useMemo, useState } from 'react';
import { ServerUser } from '../../../../shared/models';
import { Avatar } from '../ui/Avatar';
import { ModalShell } from '../ui/ModalShell';

export function InviteUsersModal({
  users,
  existingUserIds,
  onClose,
  onInvite,
}: {
  users: ServerUser[];
  existingUserIds: string[];
  onClose: () => void;
  onInvite: (userIds: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const filteredUsers = useMemo(() => users.filter((user) => user.online && !existingUserIds.includes(user.clientId) && user.nickname.toLowerCase().includes(query.toLowerCase())), [existingUserIds, query, users]);

  return (
    <ModalShell title="사용자 초대하기" subtitle="이 대화에 함께할 사람을 골라보세요." onClose={onClose}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임으로 검색" className="mb-4 w-full rounded-[18px] border border-coconut-sand bg-white px-4 py-3 outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {filteredUsers.length > 0 ? filteredUsers.map((user) => {
          const checked = selected.includes(user.clientId);
          return (
            <button key={user.clientId} type="button" onClick={() => setSelected((current) => (checked ? current.filter((id) => id !== user.clientId) : [...current, user.clientId]))} className={`flex w-full items-center justify-between rounded-[20px] border px-3 py-3 transition ${checked ? 'border-coconut-shell bg-coconut-foam' : 'border-coconut-sand bg-white'}`}>
              <div className="flex items-center gap-3">
                <Avatar name={user.nickname} color={user.color} seed={user.avatarSeed} size="sm" />
                <div className="text-left">
                  <p className="font-medium text-coconut-ink">{user.nickname}</p>
                  <p className="text-sm text-coconut-shell/70">실시간 접속 중</p>
                </div>
              </div>
              <span className="text-sm font-medium text-coconut-shell">{checked ? '선택됨' : '선택'}</span>
            </button>
          );
        }) : <div className="rounded-[22px] border border-dashed border-coconut-sand bg-white/70 px-4 py-8 text-center text-coconut-shell/75">검색 조건에 맞는 온라인 사용자가 없어요.</div>}
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-[20px] border border-coconut-sand px-4 py-3 text-coconut-shell transition hover:bg-white">취소</button>
        <button type="button" onClick={() => onInvite(selected)} disabled={selected.length === 0} className="rounded-[20px] bg-coconut-shell px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-coconut-bark disabled:cursor-not-allowed disabled:opacity-50">선택한 사용자 초대</button>
      </div>
    </ModalShell>
  );
}

