import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-slate-600 mb-4">{icon}</div>
      <h3 className="text-slate-300 font-medium text-base mb-2">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
