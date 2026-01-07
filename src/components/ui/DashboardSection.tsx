import type { ReactNode } from "react";

type DashboardSectionProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

const DashboardSection = ({ title, actionLabel, onAction, children }: DashboardSectionProps) => {
  const showAction = Boolean(actionLabel);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {showAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={!onAction}
            className="rounded-full px-3 py-1 text-sm font-semibold text-teal-700 transition hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:opacity-50"
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
};

export default DashboardSection;
