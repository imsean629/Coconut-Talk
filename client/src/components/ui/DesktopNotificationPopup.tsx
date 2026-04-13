type DesktopNotificationPopupProps = {
  notificationId: string;
  title: string;
  body: string;
  roomId?: string | null;
};

export function DesktopNotificationPopup({ notificationId, title, body, roomId }: DesktopNotificationPopupProps) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent p-2">
      <button
        type="button"
        onClick={() => void window.coconutDesktop?.notificationPopup.openTarget({ notificationId, roomId: roomId ?? undefined })}
        className="flex h-full w-full items-start gap-3 rounded-[22px] border border-[#e7d1b7] bg-[linear-gradient(180deg,#fffaf3_0%,#f4e3ce_100%)] px-4 py-3 text-left shadow-[0_20px_40px_rgba(84,56,38,0.22)] outline-none animate-[popup-slide-up_.22s_ease-out]"
      >
        <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-[#79c676] shadow-[0_0_0_4px_rgba(121,198,118,0.18)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-coconut-ink">{title}</p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-coconut-shell/82">{body}</p>
        </div>
      </button>
    </div>
  );
}
