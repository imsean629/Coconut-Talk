import { PropsWithChildren } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function ModalShell({
  title,
  subtitle,
  onClose,
  widthClass = 'max-w-xl',
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; onClose: () => void; widthClass?: string }>) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#3d2a22]/30 px-4 backdrop-blur-sm">
      <div className={`w-full ${widthClass} rounded-[30px] border border-white/70 bg-[#fffaf3] p-6 shadow-float`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-coconut-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-coconut-shell/75">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-coconut-sand bg-white p-2 text-coconut-shell transition hover:-translate-y-0.5 hover:bg-coconut-foam">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
