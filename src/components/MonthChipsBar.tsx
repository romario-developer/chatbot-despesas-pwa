import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatMonthName, getCurrentMonthInTimeZone } from "../utils/months";

type MonthChipsBarProps = {
  id?: string;
  open: boolean;
  valueMonth: string;
  months: string[];
  onSelect: (month: string) => void;
  onClose: () => void;
};

const getYearFromMonth = (value: string) => {
  const [yearStr] = value.split("-");
  const year = Number(yearStr);
  return Number.isFinite(year) ? year : null;
};

const MonthChipsBar = ({
  id,
  open,
  valueMonth,
  months,
  onSelect,
  onClose,
}: MonthChipsBarProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: null as number | null,
  });
  const currentYear = useMemo(() => {
    const currentMonth = getCurrentMonthInTimeZone("America/Bahia");
    const year = Number(currentMonth.slice(0, 4));
    return Number.isFinite(year) ? year : new Date().getFullYear();
  }, []);

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
      selectedRef.current?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, valueMonth, months.length]);

  const getChipLabel = (monthValue: string) => {
    const label = formatMonthName(monthValue);
    const year = getYearFromMonth(monthValue);
    return year && year !== currentYear ? `${label} ${year}` : label;
  };

  const getFullLabel = (monthValue: string) => {
    const label = formatMonthName(monthValue);
    const year = getYearFromMonth(monthValue);
    return year ? `${label} ${year}` : label;
  };

  const handleSelect = (monthValue: string) => {
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }
    onSelect(monthValue);
    onClose();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const container = scrollRef.current;
    if (!container) return;
    dragState.current = {
      startX: event.clientX,
      scrollLeft: container.scrollLeft,
      moved: false,
      pointerId: event.pointerId,
    };
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = scrollRef.current;
    if (!container) return;
    const delta = event.clientX - dragState.current.startX;
    if (Math.abs(delta) > 4) {
      dragState.current.moved = true;
    }
    container.scrollLeft = dragState.current.scrollLeft - delta;
    event.preventDefault();
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    const container = scrollRef.current;
    if (container && dragState.current.pointerId !== null) {
      container.releasePointerCapture(dragState.current.pointerId);
    }
    setIsDragging(false);
    if (dragState.current.moved) {
      window.setTimeout(() => {
        dragState.current.moved = false;
      }, 0);
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <div
        id={id}
        className={`absolute left-0 right-0 top-full z-30 mt-3 rounded-2xl bg-transparent px-0 py-1 transition-all duration-200 ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        role="dialog"
        aria-hidden={!open}
        aria-label="Selecionar mes"
      >
        <div
          ref={scrollRef}
          className={`no-scrollbar flex gap-2 overflow-x-auto overflow-y-hidden pb-1 pt-1 select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {months.map((monthValue) => {
            const isSelected = monthValue === valueMonth;
            return (
              <button
                key={monthValue}
                type="button"
                onClick={() => handleSelect(monthValue)}
                ref={isSelected ? selectedRef : null}
                className={`flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                    : "bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"
                }`}
                aria-pressed={isSelected}
                title={getFullLabel(monthValue)}
                aria-label={getFullLabel(monthValue)}
              >
                {getChipLabel(monthValue)}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MonthChipsBar;
