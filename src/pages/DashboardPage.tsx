import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import DashboardSection from "../components/ui/DashboardSection";
import QuickEntryCard from "../components/dashboard/QuickEntryCard";
import CreditCardsSection from "../components/dashboard/CreditCardsSection";
import { listEntries } from "../api/entries";
import { getDashboardSummary } from "../api/dashboard";
import { monthToRange } from "../utils/dateRange";
import { formatBRL, formatDate } from "../utils/format";
import { ENTRIES_CHANGED, notifyEntriesChanged } from "../utils/entriesEvents";
import { cardBase, cardHover, subtleText } from "../styles/dashboardTokens";
import { buildTag } from "../constants/build";
import type { DashboardSummary, Entry } from "../types";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

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

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }
  const label = MONTH_NAMES[monthIndex] ?? value;
  return `${label} ${year}`.trim();
};

const shiftMonth = (value: string, delta: number) => {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return value;
  const next = new Date(year, month - 1 + delta, 1);
  const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
  return `${next.getFullYear()}-${nextMonth}`;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [latestEntries, setLatestEntries] = useState<Entry[]>([]);
  const [entriesCount, setEntriesCount] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
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
      } else {
        const message =
          entriesResult.reason instanceof Error
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
    const refresh = () => loadDashboard({ silent: true });
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener(ENTRIES_CHANGED, refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener(ENTRIES_CHANGED, refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadDashboard]);

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

  const handlePrevMonth = () => setMonth((prev) => shiftMonth(prev, -1));
  const handleNextMonth = () => setMonth((prev) => shiftMonth(prev, 1));

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-teal-50/40 p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Mes</p>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
                  aria-label="Mes anterior"
                >
                  &lt;
                </button>
                <div className="relative">
                  <span className="text-2xl font-semibold text-slate-900">
                    {monthLabel}
                  </span>
                  <input
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Selecionar mes"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
                  aria-label="Proximo mes"
                >
                  &gt;
                </button>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              Resumo financeiro do mes selecionado.
            </div>
          </div>

          {summaryError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {summaryError}
            </div>
          )}

          <div className={`${cardBase} ${cardHover} space-y-1`}>
            <p className="text-xs font-semibold uppercase text-slate-500">Saldo em conta</p>
            <p className="text-3xl font-semibold text-slate-900">
              {renderSummaryValue(balance)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="grid gap-4 lg:grid-cols-3">
            <div className={`${cardBase} ${cardHover} lg:col-span-2`}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-900">Por categoria</h4>
              </div>
              {summaryLoading && !summary ? (
                <div className="text-sm text-slate-500">Carregando grafico...</div>
              ) : categoryData.length ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
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

          <CreditCardsSection />

          <DashboardSection
            title={`Ultimos lancamentos${entriesCount ? ` (${entriesCount})` : ""}`}
            actionLabel="Ver todos"
            onAction={() => navigate("/entries")}
          >
            {entriesLoading ? (
              <p className={subtleText}>Carregando lancamentos...</p>
            ) : entriesError ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {entriesError}
              </p>
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
