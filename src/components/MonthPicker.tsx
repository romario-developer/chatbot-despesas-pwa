import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  buildMonthList,
  formatMonthLabel,
  getDefaultMonthRange,
} from "../utils/months";

type SheetMonthPickerProps = {
  valueMonth: string;
  onChangeMonth: (month: string) => void;
  minMonth?: string;
  maxMonth?: string;
  trigger?: ReactNode;
  buttonClassName?: string;
};

type LegacyMonthPickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

type MonthPickerProps = SheetMonthPickerProps | LegacyMonthPickerProps;

export const monthPickerFieldButtonClassName =
  "group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export const MonthPickerFieldTrigger = ({ label }: { label: string }) => (
  <>
    <span>{label}</span>
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-slate-500 transition group-hover:text-slate-700"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  </>
);

const MonthPicker = (props: MonthPickerProps) => {
  if (!("valueMonth" in props)) {
    const { id, label, value, onChange } = props;
    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      onChange(event.target.value);
    };

    return (
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        {label && <span>{label}</span>}
        <input
          id={id}
          type="month"
          value={value}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
    );
  }

  const {
    valueMonth,
    onChangeMonth,
    minMonth,
    maxMonth,
    trigger,
    buttonClassName,
  } = props;
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const handleClose = useCallback(() => setOpen(false), []);

  const range = useMemo(() => {
    const fallbackRange = getDefaultMonthRange({ endMonth: maxMonth });
    return {
      start: minMonth ?? fallbackRange.start,
      end: fallbackRange.end,
    };
  }, [minMonth, maxMonth]);

  const monthOptions = useMemo(() => {
    const list = buildMonthList({ start: range.start, end: range.end });
    return list.length ? list : [valueMonth];
  }, [range.start, range.end, valueMonth]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, valueMonth, monthOptions.length]);

  const handleSelect = (monthValue: string) => {
    onChangeMonth(monthValue);
    handleClose();
  };

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  const triggerButtonClassName =
    buttonClassName ?? "group inline-flex flex-col items-start gap-1 text-left";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerButtonClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Selecionar mes"
      >
        {trigger ?? (
          <>
            <span className="text-2xl font-semibold text-slate-900">
              {formatMonthLabel(valueMonth)}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:border-teal-300 group-hover:text-teal-700">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 py-6"
          style={{
            paddingTop: "env(safe-area-inset-top, 1rem)",
            paddingBottom: "env(safe-area-inset-bottom, 1rem)",
          }}
          onClick={handleBackdropClick}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar mes"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex flex-col gap-3 border-b border-slate-100 px-4 pb-3"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 1rem) + 0.75rem)" }}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Selecionar mes
                </h3>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleClose();
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white min-h-[44px] min-w-[44px]"
                  aria-label="Fechar"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.72 4.72a.75.75 0 0 1 1.06 0L10 8.94l4.22-4.22a.75.75 0 1 1 1.06 1.06L11.06 10l4.22 4.22a.75.75 0 1 1-1.06 1.06L10 11.06l-4.22 4.22a.75.75 0 0 1-1.06-1.06L8.94 10 4.72 5.78a.75.75 0 0 1 0-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto px-3 py-3">
              {monthOptions.map((monthValue) => {
                const isSelected = monthValue === valueMonth;
                return (
                  <li key={monthValue}>
                    <button
                      type="button"
                      onClick={() => handleSelect(monthValue)}
                      ref={isSelected ? selectedRef : null}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-teal-50 font-semibold text-teal-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      aria-pressed={isSelected}
                    >
                      {formatMonthLabel(monthValue)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default MonthPicker;
