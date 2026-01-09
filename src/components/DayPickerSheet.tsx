import { useEffect, useMemo, useRef } from "react";

type DayPickerSheetProps = {
  open: boolean;
  title: string;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

const DayPickerSheet = ({ open, title, value, onSelect, onClose }: DayPickerSheetProps) => {
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, index) => String(index + 1)),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, value]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <span className="text-xs font-semibold uppercase text-slate-300">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
        <div className="max-h-[50vh] snap-y snap-mandatory overflow-y-auto px-4 py-4">
          {days.map((day) => {
            const isSelected = day === value;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelect(day)}
                ref={isSelected ? selectedRef : null}
                className={`mb-2 w-full snap-center rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                    : "bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
                aria-pressed={isSelected}
              >
                Dia {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayPickerSheet;
