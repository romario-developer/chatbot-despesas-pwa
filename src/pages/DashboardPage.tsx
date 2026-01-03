import { useEffect, useMemo, useState } from "react";
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
import MonthPicker from "../components/MonthPicker";
import { listEntries } from "../api/entries";
import { getSummary } from "../api/summary";
import { getPlanning } from "../api/planning";
import { monthToRange } from "../utils/dateRange";
import { formatBRL, formatCurrency, formatDate } from "../utils/format";
import { DEFAULT_PLANNING, type Entry, type Planning, type Summary } from "../types";

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const range = monthToRange(month);
        const [summaryData, entriesData, planningData] = await Promise.all([
          getSummary(month),
          listEntries({ from: range.from, to: range.to }),
          getPlanning(),
        ]);

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

        setSummary(
          summaryData ?? {
            month,
            total: 0,
            totalPorCategoria: [],
            totalPorDia: [],
          },
        );
        setEntriesCount(normalizedEntries.length);
        setLatestEntries(sortedEntries.slice(0, 10));
        setPlanningTotals({ salary, extras, fixed });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar o dashboard.";
        setError(message);
        setSummary(null);
        setLatestEntries([]);
        setEntriesCount(0);
        setPlanningTotals({ salary: 0, extras: 0, fixed: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [month]);

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
  const gastos = summary?.total ?? 0;
  const saldo = receita - gastos;
  const saldoPrevisto = receita - (gastos + planningTotals.fixed);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="card p-4 text-sm text-slate-600">Carregando dados...</div>
      );
    }

    if (error) {
      return (
        <div className="card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      );
    }

    if (!summary) {
      return (
        <div className="card p-4 text-sm text-slate-600">
          Selecione um mes para visualizar o resumo.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-4">
            <p className="text-sm text-slate-600">Total do mes</p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatCurrency(summary.total)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Qtd de lancamentos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {entriesCount}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Media por dia</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {averagePerDay !== undefined ? formatCurrency(averagePerDay) : "-"}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card p-4">
            <p className="text-sm text-slate-600">Receita (salario + extras)</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatBRL(receita)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Gastos do mes</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatBRL(gastos)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Fixas (previsto)</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatBRL(planningTotals.fixed)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Saldo</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatBRL(saldo)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-600">Saldo previsto</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatBRL(saldoPrevisto)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Total por categoria
              </h3>
            </div>
            {pieData.length === 0 ? (
              <div className="text-sm text-slate-500">Sem dados neste mes</div>
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
                    <Tooltip
                      formatter={(v: unknown) => formatBRL(Number(v) || 0)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Total por dia</h3>
            </div>
            {dayData.length === 0 ? (
              <div className="text-sm text-slate-500">Sem dados neste mes</div>
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
                      formatter={(v: unknown) =>
                        formatBRL(Number(v) || 0)
                      }
                    />
                    <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>


        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Ultimos lancamentos
            </h3>
          </div>
          {safeLatestEntries.length ? (
            <ul className="divide-y divide-slate-100">
              {safeLatestEntries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {entry.description}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatDate(entry.date)} - {entry.category}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(entry.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum lancamento encontrado para este mes.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-600">
            Resumo mensal, graficos e ultimos lancamentos.
          </p>
        </div>
        <div className="sm:w-60">
          <MonthPicker label="Mes" value={month} onChange={setMonth} />
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default DashboardPage;
