import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import MonthPicker from "../components/MonthPicker";
import Toast from "../components/Toast";
import DashboardSection from "../components/ui/DashboardSection";
import InsightCard from "../components/dashboard/cards/InsightCard";
import MetricCard from "../components/dashboard/cards/MetricCard";
import ProgressCard from "../components/dashboard/cards/ProgressCard";
import QuickEntryCard from "../components/dashboard/QuickEntryCard";
import { listEntries } from "../api/entries";
import { getSummary } from "../api/summary";
import { getPlanning } from "../api/planning";
import { monthToRange } from "../utils/dateRange";
import { formatBRL, formatDate, safeNumber } from "../utils/format";
import { DEFAULT_PLANNING, type Entry, type Planning, type Summary } from "../types";
import { ENTRIES_CHANGED, notifyEntriesChanged } from "../utils/entriesEvents";
import { cardBase, cardHover, subtleText } from "../styles/dashboardTokens";
import { buildTag } from "../constants/build";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const CATEGORY_COLORS = [
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
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [latestEntries, setLatestEntries] = useState<Entry[]>([]);
  const [entriesCount, setEntriesCount] = useState(0);
  const [planningTotals, setPlanningTotals] = useState({
    salary: 0,
    extras: 0,
    fixed: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [chartMode, setChartMode] = useState<"summary" | "daily">("summary");
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const buildVersion = import.meta.env.VITE_APP_VERSION || buildTag;
  const showBuildTag = !import.meta.env.VITE_APP_VERSION;

  const loadData = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const range = monthToRange(month);
        const [summaryData, entriesData, planningData] = await Promise.all([
          getSummary(month),
          listEntries({ from: range.from, to: range.to }),
          getPlanning(),
        ]);

        if (import.meta.env?.DEV) {
          // Log raw response for debugging summary issues in development
          // eslint-disable-next-line no-console
          console.debug("[dashboard] summary response", summaryData);
        }

        const totalValue = Number(summaryData?.total);
        const summaryValid = summaryData && Number.isFinite(totalValue);
        if (!summaryValid) {
          throw new Error("Falha ao carregar resumo do mês");
        }

        const normalizedEntries = Array.isArray(entriesData) ? entriesData : [];

        const sortedEntries = [...normalizedEntries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        const planning = (planningData ?? DEFAULT_PLANNING) as Planning;
        const salaryValue = Number(planning.salaryByMonth?.[month]);
        const salary = Number.isFinite(salaryValue) ? salaryValue : 0;
        const extrasList = Array.isArray(planning.extrasByMonth?.[month])
          ? planning.extrasByMonth?.[month]
          : [];
        const extras = extrasList.reduce((sum, item) => {
          const amount = Number(item?.amount);
          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);
        const fixed = Array.isArray(planning.fixedBills)
          ? planning.fixedBills.reduce((sum, bill) => {
              const amount = Number(bill?.amount);
              return sum + (Number.isFinite(amount) ? amount : 0);
            }, 0)
          : 0;

        setSummary({
          ...summaryData,
          total: totalValue,
        });
        setEntriesCount(normalizedEntries.length);
        setLatestEntries(sortedEntries.slice(0, 10));
        setPlanningTotals({ salary, extras, fixed });
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha ao carregar resumo do mês";
        if (!silent) {
          setError(message);
          setToast({ message, type: "error" });
          setSummary(null);
          setLatestEntries([]);
          setEntriesCount(0);
          setPlanningTotals({ salary: 0, extras: 0, fixed: 0 });
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [month],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  useEffect(() => {
    const refresh = () => loadData({ silent: true });
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
  }, [loadData]);

  useEffect(() => {
    if (!actionsOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [actionsOpen]);

  const pieData = useMemo(() => {
    const list = Array.isArray(summary?.totalPorCategoria)
      ? summary.totalPorCategoria
      : [];

    return list
      .map((item) => ({
        name: item.category || "Sem categoria",
        value: Number(item.total) || 0,
      }))
      .filter((item) => item.value > 0);
  }, [summary]);

  const dayData = useMemo(() => {
    const list = Array.isArray(summary?.totalPorDia)
      ? summary.totalPorDia
      : [];

    return list
      .map((item) => ({
        date: item.date,
        total: Number(item.total) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [summary]);

  const daysInMonth = useMemo(() => {
    const [year, monthStr] = month.split("-").map(Number);
    return new Date(year, monthStr, 0).getDate();
  }, [month]);

  const averagePerDay =
    summary && daysInMonth ? summary.total / daysInMonth : undefined;

  const safeLatestEntries = Array.isArray(latestEntries) ? latestEntries : [];
  const receita = planningTotals.salary + planningTotals.extras;
  const gastos = safeNumber(summary?.total);
  const saldo = receita - gastos;
  const saldoPrevisto = receita - (gastos + planningTotals.fixed);
  const dividasTotal = 0;

  const topCategory = useMemo(() => {
    if (!pieData.length) return null;
    const sorted = [...pieData].sort((a, b) => b.value - a.value);
    return sorted[0] ?? null;
  }, [pieData]);

  const insights = useMemo(() => {
    const items: Array<{
      title: string;
      description: string;
      tag?: string;
      tone?: "info" | "warning" | "success";
    }> = [];

    if (gastos > receita) {
      items.push({
        title: "Você gastou mais do que ganhou",
        description: "Considere revisar seus gastos para fechar o mês no azul.",
        tag: "Alerta",
        tone: "warning",
      });
    }

    if (topCategory) {
      items.push({
        title: "Maior gasto do mês",
        description: `${topCategory.name} lidera com ${formatBRL(topCategory.value)}.`,
        tag: "Dica",
        tone: "info",
      });
    }

    if (saldo > 0) {
      items.push({
        title: "Saldo positivo",
        description: `Você terminou o mês com ${formatBRL(saldo)} disponíveis.`,
        tag: "Boa notícia",
        tone: "success",
      });
    }

    return items;
  }, [gastos, receita, saldo, topCategory]);

  const receitaDespesasData = useMemo(
    () => [
      { name: "Receitas", value: receita, color: "#0ea5e9" },
      { name: "Despesas", value: gastos, color: "#f97316" },
    ],
    [receita, gastos],
  );

  const handleMissingRoute = (label: string) => {
    // eslint-disable-next-line no-console
    console.log(`TODO: rota para ${label}`);
  };

  const handleQuickAction = (type: "expense" | "income" | "debt") => {
    setActionsOpen(false);
    if (type === "debt") {
      handleMissingRoute("dividas");
      return;
    }
    navigate("/entries/new");
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={`${cardBase} ${subtleText}`}>Carregando dados...</div>
      );
    }

    if (error) {
      return (
        <div className={`${cardBase} border-rose-200 bg-rose-50 text-sm text-rose-700`}>
          {error}
        </div>
      );
    }

    if (!summary) {
      return (
        <div className={`${cardBase} ${subtleText}`}>
          Selecione um mês para visualizar o resumo.
        </div>
      );
    }

    const quickLinks = [
      {
        title: "Transações",
        subtitle: "Lançamentos e filtros",
        onClick: () => navigate("/entries"),
      },
      {
        title: "Categorias",
        subtitle: "Em breve",
        onClick: () => handleMissingRoute("categorias"),
      },
      {
        title: "Dívidas",
        subtitle: "Em breve",
        onClick: () => handleMissingRoute("dividas"),
      },
      {
        title: "Economias/Metas",
        subtitle: "Em breve",
        onClick: () => handleMissingRoute("metas"),
      },
    ];

    const hasReceitaDespesas = receitaDespesasData.some((item) => item.value > 0);

    return (
      <div className="space-y-6 sm:space-y-8">
        <DashboardSection title="Resumo do mês">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de ganhos"
              value={formatBRL(receita)}
              subtitle="Salário + extras"
              variant="positive"
            />
            <MetricCard
              title="Total de despesas"
              value={formatBRL(gastos)}
              subtitle="Lançamentos do mês"
              variant={gastos > receita ? "negative" : "default"}
            />
            <MetricCard
              title="Total de dívidas"
              value={formatBRL(dividasTotal)}
              subtitle="Sem dados"
            />
            <MetricCard
              title="Saldo disponível"
              value={formatBRL(saldo)}
              subtitle={`Previsto: ${formatBRL(saldoPrevisto)}`}
              variant="highlight"
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Lançamentos no mês"
              value={entriesCount}
              subtitle="Total de transações"
            />
            <MetricCard
              title="Média por dia"
              value={averagePerDay !== undefined ? formatBRL(averagePerDay) : "-"}
              subtitle={`${daysInMonth} dias no mês`}
            />
            <MetricCard
              title="Fixas (previsto)"
              value={formatBRL(planningTotals.fixed)}
              subtitle="Despesas recorrentes"
            />
            <ProgressCard
              title="Gastos vs receitas"
              current={gastos}
              target={receita}
              labelLeft={`Gastos ${formatBRL(gastos)}`}
              labelRight={`Receitas ${formatBRL(receita)}`}
              tone={gastos > receita ? "warning" : "success"}
            />
          </div>
        </DashboardSection>

        <DashboardSection title="Insights do mês">
          {insights.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {insights.map((item, index) => (
                <InsightCard
                  key={`${item.title}-${index}`}
                  title={item.title}
                  description={item.description}
                  tag={item.tag}
                  tone={item.tone}
                />
              ))}
            </div>
          ) : (
            <div className={`${cardBase} ${subtleText}`}>
              Sem insights disponíveis para este mês.
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Gráficos do mês">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${cardBase} ${cardHover}`}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-900">
                  Gastos por categoria
                </h4>
              </div>
              {pieData.length === 0 ? (
                <div className="text-sm text-slate-500">Sem dados neste mês</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatBRL(Number(v) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className={`${cardBase} ${cardHover}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    Receitas x despesas
                  </h4>
                  <p className="text-xs text-slate-500">
                    Resumo geral e detalhe diário
                  </p>
                </div>
                <div className="flex items-center rounded-full bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setChartMode("summary")}
                    className={`rounded-full px-3 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                      chartMode === "summary"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Resumo
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode("daily")}
                    className={`rounded-full px-3 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                      chartMode === "daily"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Por dia
                  </button>
                </div>
              </div>
              {chartMode === "summary" ? (
                hasReceitaDespesas ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={receitaDespesasData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis
                          tickFormatter={(v: number | string) =>
                            formatBRL(Number(v) || 0)
                          }
                        />
                        <Tooltip
                          formatter={(v: unknown) => formatBRL(Number(v) || 0)}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {receitaDespesasData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Sem dados neste mês</div>
                )
              ) : dayData.length === 0 ? (
                <div className="text-sm text-slate-500">Sem dados neste mês</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => d.slice(8, 10)}
                      />
                      <YAxis
                        tickFormatter={(v: number | string) =>
                          formatBRL(Number(v) || 0)
                        }
                      />
                      <Tooltip
                        labelFormatter={(label: string) => `Dia ${label}`}
                        formatter={(v: unknown) => formatBRL(Number(v) || 0)}
                      />
                      <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Acessos rápidos">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => (
              <MetricCard
                key={item.title}
                title={item.title}
                value="Abrir"
                subtitle={item.subtitle}
                onClick={item.onClick}
              />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection
          title="Últimos lançamentos"
          actionLabel="Ver detalhes"
          onAction={() => navigate("/entries")}
        >
          {safeLatestEntries.length ? (
            <ul className="divide-y divide-slate-100/80">
              {safeLatestEntries.map((entry) => (
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
            <p className={subtleText}>
              Nenhum lançamento encontrado para este mês.
            </p>
          )}
        </DashboardSection>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-teal-50/40 p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Visão Mensal</h2>
              <p className="text-sm text-slate-600">
                Resumo mensal, gráficos e atalhos para acompanhar seus gastos.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
              <div className="sm:w-52">
                <MonthPicker label="Mês" value={month} onChange={setMonth} />
              </div>
              <div className="flex items-center gap-2">
                <div ref={actionsRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setActionsOpen((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                    aria-label="Ações rápidas"
                    aria-haspopup="menu"
                    aria-expanded={actionsOpen}
                  >
                    +
                  </button>
                  {actionsOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleQuickAction("expense")}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                      >
                        Adicionar despesa
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleQuickAction("income")}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                      >
                        Adicionar ganho
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleQuickAction("debt")}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                      >
                        Adicionar dívida
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <QuickEntryCard onCreated={notifyEntriesChanged} />

          {renderContent()}

          {showBuildTag && (
            <div className="text-[11px] text-slate-400">
              build: {buildVersion}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;

