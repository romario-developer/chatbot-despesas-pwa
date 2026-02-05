import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import DashboardSection from "../components/ui/DashboardSection";
import MonthChipsBar from "../components/MonthChipsBar";
import { formatBRL, formatDate } from "../utils/format";
import { formatCentsToBRL } from "../utils/money";
import { DATA_CHANGED_EVENT, type DataChangedDetail } from "../utils/dataBus";
import { ENTRIES_CHANGED, ENTRY_CREATED } from "../utils/entriesEvents";
import {
  buildMonthList,
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  isMonthInRange,
  shiftMonth,
} from "../utils/months";
import { cardBase, cardHover, subtleText } from "../styles/dashboardTokens";
import { buildTag } from "../constants/build";
import DashboardCardsList from "../components/DashboardCardsList";
import { useApiReadyState } from "../hooks/useApiReadyState";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useEntries } from "../hooks/useEntries";

const CATEGORY_FALLBACK_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#f43f5e",
  "#14b8a6",
  "#eab308",
  "#3b82f6",
];

const isDashboardDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("DEBUG_DASHBOARD") === "1";
};

const logDashboardDebug = (...args: unknown[]) => {
  if (!isDashboardDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[dashboard-debug]", ...args);
};

const SYNC_DEBUG_KEY = "DEBUG_SYNC";
const isSyncDebugEnabled = () =>
  typeof window !== "undefined" && window.localStorage.getItem(SYNC_DEBUG_KEY) === "1";
const logSyncDebug = (...args: unknown[]) => {
  if (!isSyncDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[sync]", ...args);
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const currentMonth = useMemo(
    () => getCurrentMonthInTimeZone("America/Bahia"),
    [],
  );
  const monthRange = useMemo(() => {
    const start = shiftMonth(currentMonth, -12);
    const end = shiftMonth(currentMonth, 6);
    return { start, end };
  }, [currentMonth]);
  const [month, setMonth] = useState(() => {
    if (typeof window === "undefined") return currentMonth;
    const stored = localStorage.getItem("selectedMonth");
    return stored && isMonthInRange(stored, monthRange.start, monthRange.end)
      ? stored
      : currentMonth;
  });
  const [entriesPollingEnabled, setEntriesPollingEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [isMonthPanelOpen, setIsMonthPanelOpen] = useState(false);
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary(month);
  const {
    data: entriesData,
    isLoading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries,
  } = useEntries(month, { pollIntervalMs: entriesPollingEnabled ? 20_000 : 0 });
  const safeEntries = Array.isArray(entriesData) ? entriesData : [];
  const latestEntriesList = useMemo(() => {
    return [...safeEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [safeEntries]);
  const entriesCount = safeEntries.length;
  const buildVersion = import.meta.env.VITE_APP_VERSION || buildTag;
  const showBuildTag = !import.meta.env.VITE_APP_VERSION;
  const { readyVersion } = useApiReadyState();

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedMonth", month);
  }, [month]);

  useEffect(() => {
    logDashboardDebug("month selected", month);
  }, [month]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<DataChangedDetail>).detail;
      const matchesMonth = !detail.month || detail.month === month;
      const shouldRefetchSummary = detail.scope === "all" || detail.scope === "dashboard";
      const shouldRefetchEntries =
        matchesMonth && (detail.scope === "all" || detail.scope === "entries");
      if (shouldRefetchSummary) {
        void refetchSummary({ silent: true });
      }
      if (shouldRefetchEntries) {
        void refetchEntries({ silent: true });
      }
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    };
  }, [month, refetchEntries, refetchSummary]);

  useEffect(() => {
    if (!summaryError) return;
    setToast({ message: summaryError.message, type: "error" });
  }, [summaryError]);

  useEffect(() => {
    if (!entriesError) {
      setEntriesPollingEnabled(true);
      return;
    }
    const status = (entriesError as (Error & { status?: number }))?.status;
    if (typeof status === "number" && status >= 500) {
      setEntriesPollingEnabled(false);
    }
  }, [entriesError]);

  const refreshDashboard = useCallback(() => {
    if (!entriesPollingEnabled) return;
    void refetchSummary({ silent: true });
    void refetchEntries({ silent: true });
  }, [entriesPollingEnabled, refetchEntries, refetchSummary]);

  useEffect(() => {
    refreshDashboard();
  }, [readyVersion, refreshDashboard]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    };
    const refreshOnEvent = () => refreshDashboard();

    window.addEventListener("focus", refreshOnEvent);
    window.addEventListener("online", refreshOnEvent);
    window.addEventListener(ENTRIES_CHANGED, refreshOnEvent);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", refreshOnEvent);
      window.removeEventListener("online", refreshOnEvent);
      window.removeEventListener(ENTRIES_CHANGED, refreshOnEvent);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleEntryCreated = () => {
      logSyncDebug("entry:created received - refreshing dashboard");
      refreshDashboard();
    };
    window.addEventListener(ENTRY_CREATED, handleEntryCreated);
    return () => {
      window.removeEventListener(ENTRY_CREATED, handleEntryCreated);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    if (import.meta.env.DEV || isLocalHost || showBuildTag) {
      // eslint-disable-next-line no-console
      console.info("[build] version:", buildVersion);
    }
  }, [buildVersion, showBuildTag]);

  const monthLabel = useMemo(() => formatMonthLabel(month), [month]);
  const monthOptions = useMemo(
    () => buildMonthList({ start: monthRange.start, end: monthRange.end }),
    [monthRange.end, monthRange.start],
  );

  const categoryData = useMemo(() => {
    const list = Array.isArray(summaryData?.byCategory) ? summaryData.byCategory : [];
    return list
      .map((item, index) => ({
        category: item.category || "Sem categoria",
        total: Number(item.total) || 0,
        color: item.color || CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length],
      }))
      .filter((item) => item.total > 0);
  }, [summaryData]);

  const balanceCents = summaryData?.balanceCents ?? 0;
  const incomeTotalCents = summaryData?.incomeTotalCents ?? 0;
  const cashExpensesCents = summaryData?.expenseCashTotalCents ?? 0;
  const creditExpensesCents = summaryData?.expenseCreditTotalCents ?? 0;
  const renderSummaryValue = (valueCents: number) =>
    summaryData ? formatCentsToBRL(valueCents) : "--";
  const summaryValueClassName =
    "max-w-full overflow-hidden text-ellipsis whitespace-nowrap leading-tight text-2xl font-semibold sm:text-3xl md:text-4xl";
  const handleMonthToggle = () => {
    setIsMonthPanelOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!summaryData) return;
    logDashboardDebug("totals", {
      month: summaryData.month,
      balance: balanceCents,
      incomeTotal: incomeTotalCents,
      expenseCash: cashExpensesCents,
      expenseCredit: creditExpensesCents,
      entriesCount,
    });
  }, [
    summaryData,
    balanceCents,
    incomeTotalCents,
    cashExpensesCents,
    creditExpensesCents,
    entriesCount,
  ]);

  const handleRetryEntries = useCallback(() => {
    setEntriesPollingEnabled(true);
    void refetchEntries();
  }, [refetchEntries]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-6 shadow-[0_20px_45px_rgba(15,23,42,0.25)]">
        <div className="space-y-6">
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[var(--text-muted)]">MÊS</p>
                <button
                  type="button"
                  onClick={handleMonthToggle}
                  className="group mt-1 inline-flex items-center gap-3 text-left"
                  aria-expanded={isMonthPanelOpen}
                  aria-controls="dashboard-month-panel"
                >
                  <span className="text-3xl font-semibold text-[var(--text-primary)]">
                    {monthLabel}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-[0_12px_20px_rgba(15,23,42,0.15)] transition group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 transition ${
                        isMonthPanelOpen ? "rotate-180" : "rotate-0"
                      }`}
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </button>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Resumo financeiro do mês selecionado.
              </div>
            </div>

            <MonthChipsBar
              id="dashboard-month-panel"
              open={isMonthPanelOpen}
              valueMonth={month}
              months={monthOptions}
              onSelect={setMonth}
              onClose={() => setIsMonthPanelOpen(false)}
            />
          </div>

          {summaryError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {summaryError.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              className={`${cardBase} ${cardHover} flex min-h-[104px] flex-col justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5 sm:min-h-[140px]`}
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
                  Saldo em conta
                </p>
                <p
                  className={`${summaryValueClassName} text-[var(--text-primary)]`}
                >
                  {renderSummaryValue(balanceCents)}
                </p>
              </div>
            </div>
            <div
              className={`${cardBase} ${cardHover} flex min-h-[104px] flex-col justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5 sm:min-h-[140px]`}
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
                  Receitas
                </p>
                <p
                  className={`${summaryValueClassName} text-[var(--success)]`}
                >
                  {renderSummaryValue(incomeTotalCents)}
                </p>
              </div>
            </div>
            <div
              className={`${cardBase} ${cardHover} col-span-2 flex min-h-[104px] flex-col justify-between gap-3 px-4 py-4 sm:col-span-1 sm:px-5 sm:py-5 sm:min-h-[140px]`}
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
                  Gastos (Caixa)
                </p>
                <p
                  className={`${summaryValueClassName} text-[var(--danger)]`}
                >
                  {renderSummaryValue(cashExpensesCents)}
                </p>
              </div>
            </div>
          </div>
          <DashboardCardsList month={month} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className={`${cardBase} ${cardHover} lg:col-span-2`}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-[var(--text-primary)]">Por categoria</h4>
              </div>
              {summaryLoading && !summaryData ? (
                <div className="text-sm text-[var(--text-muted)]">Carregando grafico...</div>
              ) : categoryData.length ? (
                <div className="h-[220px] min-h-[220px] w-full">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="total"
                        nameKey="category"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {categoryData.map((item, index) => (
                          <Cell
                            key={`${item.category}-${index}`}
                            fill={item.color}
                          />
                        ))}
                      </Pie>
                    <Tooltip formatter={(v: unknown) => formatCentsToBRL(Number(v) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                    <div className="text-sm text-[var(--text-muted)]">Sem dados neste mês.</div>
              )}
            </div>

            <div className={`${cardBase} ${cardHover}`}>
              <h4 className="text-base font-semibold text-[var(--text-primary)]">Categorias</h4>
              <div className="mt-3 space-y-2">
                {categoryData.length ? (
                  categoryData.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between text-sm text-[var(--text-muted)]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.category}</span>
                      </div>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatCentsToBRL(item.total)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">Sem categorias para este mês.</p>
                )}
              </div>
            </div>
          </div>

          <DashboardSection
            title={`Ultimos lancamentos${entriesCount ? ` (${entriesCount})` : ""}`}
            actionLabel="Ver todos"
            onAction={() => navigate("/entries")}
          >
            {entriesLoading ? (
              <p className={subtleText}>Carregando lancamentos...</p>
            ) : entriesError ? (
              <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
                <p>{entriesError.message}</p>
                <button
                  type="button"
                  onClick={handleRetryEntries}
                  className="mt-2 inline-flex items-center rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] transition hover:opacity-90"
                >
                  Tentar novamente
                </button>
              </div>
            ) : latestEntriesList.length ? (
              <ul className="divide-y divide-[var(--border)]">
                {latestEntriesList.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {entry.description}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(entry.date)} - {entry.category}
                        {entry.categoryInferred && (
                          <span className="ml-2 inline-flex rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                            auto
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatBRL(entry.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-1">
                <p className={subtleText}>Nenhum lançamento encontrado para este mês.</p>
                <p className="text-xs text-[var(--text-muted)]">Adicione lançamentos para visualizar este resumo.</p>
              </div>
            )}
          </DashboardSection>

          {showBuildTag && (
          <div className="text-[11px] text-[var(--text-muted)]">build: {buildVersion}</div>
          )}
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default DashboardPage;

