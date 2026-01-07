import type { ReactNode } from "react";

type DashboardSectionProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

const DashboardSection = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: DashboardSectionProps) => {
  const showAction = Boolean(actionLabel);

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
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
      <div className="mt-4">{children}</div>
    </section>
  );
};

export default DashboardSection;
