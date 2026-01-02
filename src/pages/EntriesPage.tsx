import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listCategories } from "../api/categories";
import { listEntries } from "../api/entries";
import MonthPicker from "../components/MonthPicker";
import { monthToRange } from "../utils/dateRange";
import { formatCurrency, formatDate } from "../utils/format";
import type { Entry } from "../types";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const EntriesPage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<unknown>([]);
  const [entries, setEntries] = useState<Entry[] | unknown>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await listCategories();
        setCategories(data);
      } catch {
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { from, to } = monthToRange(month);
        const data = await listEntries({
          from,
          to,
          category: category || undefined,
          q: search || undefined,
        });

        const safeData = Array.isArray(data) ? data : [];
        const sorted = [...safeData].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setEntries(sorted);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar os lancamentos.";
        setError(message);
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [month, category, search]);

  const safeCategories = Array.isArray(categories)
    ? categories
    : Object.keys((categories ?? {}) as Record<string, unknown>);

  const safeEntries = Array.isArray(entries) ? entries : [];

  const totalAmount = useMemo(
    () => safeEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [safeEntries],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Lancamentos</h2>
          <p className="text-sm text-slate-600">
            Filtre por mes, categoria ou busque por descricao.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/entries/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            Novo lancamento
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MonthPicker label="Mes" value={month} onChange={setMonth} />

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todas</option>
            {safeCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Busca
          <input
            type="search"
            placeholder="Descricao..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {safeEntries.length} lancamento(s) - Total {formatCurrency(totalAmount)}
          </p>
        </div>

        {isLoading && (
          <p className="mt-3 text-sm text-slate-600">Carregando lancamentos...</p>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!isLoading && !error && (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {safeEntries.length ? (
                safeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.description}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(entry.amount)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      {formatDate(entry.date)} - {entry.category}
                    </p>
                    <p className="text-xs text-slate-500">Origem: {entry.source}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Nenhum lancamento encontrado.</p>
              )}
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Descricao</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeEntries.length ? (
                    safeEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{entry.category}</td>
                        <td className="px-4 py-3 text-slate-700">{entry.source}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-500" colSpan={5}>
                        Nenhum lancamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EntriesPage;
