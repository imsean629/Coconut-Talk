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
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-[320px] flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur-md">
          <p className="font-semibold text-coconut-ink">{toast.title}</p>
          {toast.description && <p className="mt-1 text-sm text-coconut-shell/75">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}
