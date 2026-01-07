import type { ReactNode } from "react";
import { cardBase, cardHover, subtleText, titleMuted, valueBig } from "../../../styles/dashboardTokens";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "positive" | "negative" | "highlight";
  onClick?: () => void;
};

const variantClasses: Record<NonNullable<MetricCardProps["variant"]>, string> = {
  default: "border-slate-200/80",
  positive: "border-emerald-200/70 bg-emerald-50/60",
  negative: "border-rose-200/70 bg-rose-50/60",
  highlight: "border-teal-300/80 bg-teal-50/70 shadow-teal-100/60",
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  onClick,
}: MetricCardProps) => {
  const baseClasses = [
    cardBase,
    cardHover,
    "text-left",
    variantClasses[variant],
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40`}
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3">
          <p className={titleMuted}>{title}</p>
          {icon ? <span className="text-slate-400">{icon}</span> : null}
        </div>
        <p className={`${valueBig} mt-2`}>{value}</p>
        {subtitle ? <p className={`${subtleText} mt-1`}>{subtitle}</p> : null}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="flex items-start justify-between gap-3">
        <p className={titleMuted}>{title}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className={`${valueBig} mt-2`}>{value}</p>
      {subtitle ? <p className={`${subtleText} mt-1`}>{subtitle}</p> : null}
    </div>
  );
};

export default MetricCard;
