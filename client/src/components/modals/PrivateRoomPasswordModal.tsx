import { FormEvent, useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { ModalShell } from '../ui/ModalShell';
import { AppRoom } from '../../types';

export function PrivateRoomPasswordModal({
  room,
  onClose,
  onConfirm,
}: {
  room: AppRoom;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!password.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(password.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="비공개방 입장" subtitle="비밀번호를 입력하면 바로 입장할 수 있어요." onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-[24px] border border-[#efdcc8] bg-[#fffaf5] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coconut-shell text-white">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-coconut-shell/70">입장할 대화방</p>
              <p className="text-lg font-semibold text-coconut-ink">{room.title}</p>
            </div>
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-coconut-shell">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="방 비밀번호 입력"
            className="w-full rounded-[20px] border border-coconut-sand bg-white px-4 py-3 outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10"
          />
          {touched && !password.trim() && <p className="mt-2 text-sm text-rose-500">비밀번호를 입력해주세요.</p>}
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-[20px] border border-coconut-sand px-4 py-3 text-coconut-shell transition hover:bg-white">
            취소
          </button>
          <button type="submit" disabled={submitting} className="rounded-[20px] bg-coconut-shell px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-coconut-bark disabled:cursor-not-allowed disabled:opacity-60">
            입장하기
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
