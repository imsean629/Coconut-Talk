import { useEffect } from 'react';
import { useChatStore } from '../../store/useAppStore';

export function ToastLayer() {
  const toasts = useChatStore((state) => state.toasts);
  const dismissToast = useChatStore((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => setTimeout(() => dismissToast(toast.id), 2800));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [dismissToast, toasts]);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[320px] flex-col-reverse gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-3xl border border-[#ead6bf] bg-[linear-gradient(180deg,#fffaf4_0%,#f7ead8_100%)] p-4 shadow-[0_18px_40px_rgba(84,56,38,0.18)] backdrop-blur-md animate-[toast-rise_.22s_ease-out]">
          <p className="font-semibold text-coconut-ink">{toast.title}</p>
          {toast.description && <p className="mt-1 text-sm text-coconut-shell/75">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}
