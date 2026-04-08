import { ModalShell } from '../ui/ModalShell';

export function LogoutConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell title="코코넛톡을 나갈까요?" subtitle="현재 임시 세션 연결이 종료돼요." onClose={onClose} widthClass="max-w-md">
      <div className="space-y-5">
        <p className="text-sm leading-6 text-coconut-shell/80">로그아웃하면 실시간 연결이 종료되고 다시 작은 로그인 창으로 돌아가요. 이 기기에 저장된 대화 기록은 그대로 남아 있어요.</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-[20px] border border-coconut-sand px-4 py-3 text-coconut-shell transition hover:bg-white">계속 둘러보기</button>
          <button type="button" onClick={onConfirm} className="rounded-[20px] bg-coconut-shell px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-coconut-bark">로그아웃</button>
        </div>
      </div>
    </ModalShell>
  );
}
