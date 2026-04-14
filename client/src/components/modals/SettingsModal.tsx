import { ModalShell } from '../ui/ModalShell';

export function SettingsModal({
  desktopNotificationsEnabled,
  onToggleDesktopNotifications,
  onClose,
}: {
  desktopNotificationsEnabled: boolean;
  onToggleDesktopNotifications: (enabled: boolean) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="설정" subtitle="작업표시줄 우측 하단 알림을 켜고 끌 수 있어요." onClose={onClose} widthClass="max-w-md">
      <div className="space-y-5">
        <div className="rounded-[24px] border border-coconut-sand bg-white/80 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-coconut-ink">작업표시줄 알림</h3>
              <p className="text-xs leading-5 text-coconut-shell/80">새 메시지가 오면 우측 하단에 작은 카드 알림을 표시해요.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={desktopNotificationsEnabled}
              onClick={() => onToggleDesktopNotifications(!desktopNotificationsEnabled)}
              className={`relative mt-0.5 flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                desktopNotificationsEnabled ? 'border-[#8b6b53] bg-[#8b6b53]' : 'border-[#d8c1a8] bg-[#efe3d3]'
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow transition ${
                  desktopNotificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[20px] bg-coconut-shell px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-coconut-bark"
          >
            닫기
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
