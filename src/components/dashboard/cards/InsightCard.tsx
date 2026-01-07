import { cardBase, subtleText } from "../../../styles/dashboardTokens";

type InsightCardProps = {
  title: string;
  description: string;
  tag?: string;
  tone?: "info" | "warning" | "success";
  actionLabel?: string;
  onAction?: () => void;
};

const toneStyles: Record<NonNullable<InsightCardProps["tone"]>, { border: string; pill: string }> = {
  info: {
    border: "border-sky-200/80",
    pill: "bg-sky-100 text-sky-800",
  },
  warning: {
    border: "border-amber-200/80",
    pill: "bg-amber-100 text-amber-800",
  },
  success: {
    border: "border-emerald-200/80",
    pill: "bg-emerald-100 text-emerald-800",
  },
};

const InsightCard = ({
  title,
  description,
  tag,
  tone = "info",
  actionLabel,
  onAction,
}: InsightCardProps) => {
  const toneStyle = toneStyles[tone];

  return (
    <div className={[cardBase, toneStyle.border].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {tag ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${toneStyle.pill}`}
            >
              {tag}
            </span>
          ) : null}
          <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
        </div>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            disabled={!onAction}
            className="rounded-full px-2 py-1 text-xs font-semibold text-teal-700 transition hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:opacity-50"
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <p className={`${subtleText} mt-3`}>{description}</p>
    </div>
  );
};

export default InsightCard;
