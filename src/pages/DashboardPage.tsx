import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import DashboardSection from "../components/ui/DashboardSection";
import QuickEntryCard from "../components/dashboard/QuickEntryCard";
import CreditCardsSection from "../components/dashboard/CreditCardsSection";
import MonthChipsBar from "../components/MonthChipsBar";
import { listEntries } from "../api/entries";
import { getDashboardSummary } from "../api/dashboard";
import { monthToRange } from "../utils/dateRange";
import { formatBRL, formatDate } from "../utils/format";
import { ENTRIES_CHANGED, notifyEntriesChanged } from "../utils/entriesEvents";
import {
  buildMonthList,
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  isMonthInRange,
  shiftMonth,
} from "../utils/months";
import { cardBase, cardHover, subtleText } from "../styles/dashboardTokens";
import { buildTag } from "../constants/build";
import type { DashboardSummary, Entry } from "../types";

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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [latestEntries, setLatestEntries] = useState<Entry[]>([]);
  const [entriesCount, setEntriesCount] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesPollingEnabled, setEntriesPollingEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [isMonthPanelOpen, setIsMonthPanelOpen] = useState(false);
  const buildVersion = import.meta.env.VITE_APP_VERSION || buildTag;
  const showBuildTag = !import.meta.env.VITE_APP_VERSION;

  const loadDashboard = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) {
        setSummaryLoading(true);
        setEntriesLoading(true);
        setSummaryError(null);
        setEntriesError(null);
      }

      const range = monthToRange(month);
      const [summaryResult, entriesResult] = await Promise.allSettled([
        getDashboardSummary(month),
        listEntries({ from: range.from, to: range.to }),
      ]);

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
        setSummaryError(null);
      } else {
        const message =
          summaryResult.reason instanceof Error
            ? summaryResult.reason.message
            : "Erro ao carregar resumo.";
        setSummary(null);
        setSummaryError(message);
        if (!silent) {
          setToast({ message, type: "error" });
        }
      }

      if (entriesResult.status === "fulfilled") {
        const normalizedEntries = Array.isArray(entriesResult.value)
          ? entriesResult.value
          : [];
        const sortedEntries = [...normalizedEntries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setLatestEntries(sortedEntries.slice(0, 6));
        setEntriesCount(normalizedEntries.length);
        setEntriesError(null);
        setEntriesPollingEnabled(true);
      } else {
        const reason = entriesResult.reason as Error & { status?: number };
        const status = reason?.status;
        const isServerError = typeof status === "number" && status >= 500;
        if (isServerError) {
          setEntriesPollingEnabled(false);
        }
        const message =
          isServerError
            ? "Erro ao carregar lancamentos"
            : entriesResult.reason instanceof Error
            ? entriesResult.reason.message
            : "Erro ao carregar lancamentos.";
        setLatestEntries([]);
        setEntriesCount(0);
        setEntriesError(message);
        if (!silent) {
          setToast({ message, type: "error" });
        }
      }

      setSummaryLoading(false);
      setEntriesLoading(false);
    },
    [month],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedMonth", month);
  }, [month]);

  const refreshDashboard = useCallback(() => {
    if (!entriesPollingEnabled) return;
    loadDashboard({ silent: true });
  }, [entriesPollingEnabled, loadDashboard]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    };

    window.addEventListener("focus", refreshDashboard);
    window.addEventListener("online", refreshDashboard);
    window.addEventListener(ENTRIES_CHANGED, refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", refreshDashboard);
      window.removeEventListener("online", refreshDashboard);
      window.removeEventListener(ENTRIES_CHANGED, refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibility);
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
    const list = Array.isArray(summary?.byCategory) ? summary?.byCategory : [];
    return list
      .map((item, index) => ({
        category: item.category || "Sem categoria",
        total: Number(item.total) || 0,
        color: item.color || CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length],
      }))
      .filter((item) => item.total > 0);
  }, [summary]);

  const balance = summary?.balance ?? 0;
  const incomeTotal = summary?.incomeTotal ?? 0;
  const expenseTotal = summary?.expenseTotal ?? 0;
  const renderSummaryValue = (value: number) => (summary ? formatBRL(value) : "--");
  const handleMonthToggle = () => {
    setIsMonthPanelOpen((prev) => !prev);
  };

  const handleRetryEntries = useCallback(() => {
    setEntriesPollingEnabled(true);
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-teal-50/40 p-4 sm:p-6">
        <div className="space-y-6">
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Mes</p>
                <button
                  type="button"
                  onClick={handleMonthToggle}
                  className="group mt-1 inline-flex items-center gap-2 text-left"
                  aria-expanded={isMonthPanelOpen}
                  aria-controls="dashboard-month-panel"
                >
                  <span className="text-2xl font-semibold text-slate-900">
                    {monthLabel}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:border-purple-300 group-hover:text-purple-600">
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
              <div className="text-sm text-slate-600">
                Resumo financeiro do mes selecionado.
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
              {summaryError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className={`${cardBase} ${cardHover} col-span-2 space-y-1 md:col-span-1`}>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Saldo em conta
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {renderSummaryValue(balance)}
              </p>
            </div>
            <div className={`${cardBase} ${cardHover} space-y-1`}>
              <p className="text-xs font-semibold uppercase text-slate-500">Receitas</p>
              <p className="text-2xl font-semibold text-emerald-700">
                {renderSummaryValue(incomeTotal)}
              </p>
            </div>
            <div className={`${cardBase} ${cardHover} space-y-1`}>
              <p className="text-xs font-semibold uppercase text-slate-500">Despesas</p>
              <p className="text-2xl font-semibold text-rose-600">
                {renderSummaryValue(expenseTotal)}
              </p>
            </div>
          </div>

          <CreditCardsSection />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className={`${cardBase} ${cardHover} lg:col-span-2`}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-900">Por categoria</h4>
              </div>
              {summaryLoading && !summary ? (
                <div className="text-sm text-slate-500">Carregando grafico...</div>
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
                      <Tooltip formatter={(v: unknown) => formatBRL(Number(v) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Sem dados neste mes.</div>
              )}
            </div>

            <div className={`${cardBase} ${cardHover}`}>
              <h4 className="text-base font-semibold text-slate-900">Categorias</h4>
              <div className="mt-3 space-y-2">
                {categoryData.length ? (
                  categoryData.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between text-sm text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.category}</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatBRL(item.total)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sem categorias para este mes.</p>
                )}
              </div>
            </div>
          </div>

          <QuickEntryCard onCreated={notifyEntriesChanged} />

          <DashboardSection
            title={`Ultimos lancamentos${entriesCount ? ` (${entriesCount})` : ""}`}
            actionLabel="Ver todos"
            onAction={() => navigate("/entries")}
          >
            {entriesLoading ? (
              <p className={subtleText}>Carregando lancamentos...</p>
            ) : entriesError ? (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <p>{entriesError}</p>
                <button
                  type="button"
                  onClick={handleRetryEntries}
                  className="mt-2 inline-flex items-center rounded bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
                >
                  Tentar novamente
                </button>
              </div>
            ) : latestEntries.length ? (
              <ul className="divide-y divide-slate-100/80">
                {latestEntries.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {entry.description}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatDate(entry.date)} - {entry.category}
                        {entry.categoryInferred && (
                          <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                            auto
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatBRL(entry.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={subtleText}>Nenhum lancamento encontrado para este mes.</p>
            )}
          </DashboardSection>

          {showBuildTag && (
            <div className="text-[11px] text-slate-400">build: {buildVersion}</div>
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

