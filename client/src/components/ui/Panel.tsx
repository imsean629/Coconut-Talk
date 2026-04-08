import { PropsWithChildren } from 'react';
import clsx from 'clsx';

export function Panel({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx('rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md', className)}>{children}</div>;
}
