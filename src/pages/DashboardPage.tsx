import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { monthToRange } from "../utils/dateRange";
import { formatCurrency, formatDate } from "../utils/format";
import type { Entry, Summary } from "../types";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const range = monthToRange(month);
        const [summaryData, entriesData] = await Promise.all([
          getSummary(month),
          listEntries({ from: range.from, to: range.to }),
        ]);

        const sortedEntries = [...entriesData].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setSummary(summaryData);
        setEntriesCount(entriesData.length);
        setLatestEntries(sortedEntries.slice(0, 10));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar o dashboard.";
        setError(message);
        setSummary(null);
        setLatestEntries([]);
        setEntriesCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [month]);

  const pieData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.totalPorCategoria).map(([name, value]) => ({
      name,
      value,
    }));
  }, [summary]);

  const barData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.totalPorDia)
      .map(([day, value]) => {
        const dayLabel = day.split("-").pop() ?? day;
        return { day: dayLabel, value };
      })
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [summary]);

  const daysInMonth = useMemo(() => {
    const [year, monthStr] = month.split("-").map(Number);
    return new Date(year, monthStr, 0).getDate();
  }, [month]);

  const averagePerDay =
    summary && daysInMonth ? summary.total / daysInMonth : undefined;

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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Total por categoria
              </h3>
            </div>
            {pieData.length ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={2}
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | string | undefined) =>
                        formatCurrency(Number(value ?? 0))
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sem dados para este mes.</p>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Total por dia</h3>
            </div>
            {barData.length ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number | string | undefined) =>
                        formatCurrency(Number(value ?? 0))
                      }
                    />
                    <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sem dados para este mes.</p>
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Ultimos lancamentos
            </h3>
          </div>
          {latestEntries.length ? (
            <ul className="divide-y divide-slate-100">
              {latestEntries.map((entry) => (
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
