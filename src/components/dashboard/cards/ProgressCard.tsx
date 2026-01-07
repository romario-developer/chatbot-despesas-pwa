import { cardBase, cardHover, titleMuted } from "../../../styles/dashboardTokens";
import { clamp, formatBRL, formatPercent, safeNumber } from "../../../utils/format";

type ProgressCardProps = {
  title: string;
  current: number;
  target: number;
  labelLeft?: string;
  labelRight?: string;
  tone?: "info" | "success" | "warning";
};

const toneStyles: Record<NonNullable<ProgressCardProps["tone"]>, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
};

const ProgressCard = ({
  title,
  current,
  target,
  labelLeft,
  labelRight,
  tone = "info",
}: ProgressCardProps) => {
  const safeCurrent = safeNumber(current);
  const safeTarget = safeNumber(target);
  const percent =
    safeTarget > 0 ? clamp((safeCurrent / safeTarget) * 100, 0, 100) : 0;

  return (
    <div className={`${cardBase} ${cardHover}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={titleMuted}>{title}</p>
        <span className="text-sm font-semibold text-slate-700">
          {formatPercent(percent)}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${toneStyles[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{labelLeft ?? formatBRL(safeCurrent)}</span>
        <span>{labelRight ?? formatBRL(safeTarget)}</span>
      </div>
    </div>
  );
};

export default ProgressCard;
