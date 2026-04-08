import { FormEvent, useMemo, useState } from 'react';
import { ServerUser } from '../../../../shared/models';
import { Avatar } from '../ui/Avatar';
import { ModalShell } from '../ui/ModalShell';

export function CreateRoomModal({
  users,
  onClose,
  onCreate,
}: {
  users: ServerUser[];
  onClose: () => void;
  onCreate: (payload: { title: string; description?: string; type: 'public' | 'private'; invitedUserIds: string[]; password?: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const filtered = useMemo(() => users.filter((user) => user.online && user.nickname.toLowerCase().includes(query.toLowerCase())), [query, users]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!title.trim()) return;
    if (type === 'private' && !password.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      invitedUserIds: selected,
      password: type === 'private' ? password.trim() : undefined,
    });
  };

  return (
    <ModalShell title="새 대화방 만들기" subtitle="실시간으로 함께 대화할 공간을 열어보세요." onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-coconut-shell">방 제목</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="주말 코코넛 모임" className="w-full rounded-[20px] border border-coconut-sand bg-white px-4 py-3 outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
          {touched && !title.trim() && <p className="mt-2 text-sm text-rose-500">방 제목을 입력해주세요.</p>}
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-coconut-shell">방 설명</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="방의 분위기나 목적을 적어보세요" className="w-full rounded-[20px] border border-coconut-sand bg-white px-4 py-3 outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
        </label>
        <div>
          <span className="mb-2 block text-sm font-medium text-coconut-shell">공개 설정</span>
          <div className="grid grid-cols-2 gap-3">
            {(['public', 'private'] as const).map((option) => (
              <button key={option} type="button" onClick={() => setType(option)} className={`rounded-[22px] border px-4 py-3 text-left transition ${type === option ? 'border-coconut-shell bg-coconut-shell text-white' : 'border-coconut-sand bg-white text-coconut-shell'}`}>
                <p className="font-semibold">{option === 'public' ? '공개방' : '비공개방'}</p>
                <p className={`mt-1 text-sm ${type === option ? 'text-white/80' : 'text-coconut-shell/70'}`}>{option === 'public' ? '누구나 바로 입장 가능' : '비밀번호 입력 후 입장 가능'}</p>
              </button>
            ))}
          </div>
        </div>
        {type === 'private' && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coconut-shell">방 비밀번호</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="입장할 때 사용할 비밀번호" className="w-full rounded-[20px] border border-coconut-sand bg-white px-4 py-3 outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
            {touched && !password.trim() && <p className="mt-2 text-sm text-rose-500">비공개방은 비밀번호를 입력해주세요.</p>}
          </label>
        )}
        <div>
          <span className="mb-2 block text-sm font-medium text-coconut-shell">처음 초대할 사람</span>
          <p className="mb-3 text-xs text-coconut-shell/65">초대된 사람은 바로 참여자로 추가돼요. 비공개방은 다른 사람도 비밀번호를 입력하면 입장할 수 있어요.</p>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임 검색" className="mb-3 w-full rounded-[18px] border border-coconut-sand bg-white px-4 py-3 outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {filtered.map((user) => {
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
                  <span className="text-sm font-medium text-coconut-shell">{checked ? '추가됨' : '초대'}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-[20px] border border-coconut-sand px-4 py-3 text-coconut-shell transition hover:bg-white">취소</button>
          <button type="submit" className="rounded-[20px] bg-coconut-shell px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-coconut-bark">방 만들기</button>
        </div>
      </form>
    </ModalShell>
  );
}
