import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { deleteEntry, listEntries } from "../api/entries";
import MonthChipsBar from "../components/MonthChipsBar";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import { ENTRIES_CHANGED, notifyEntriesChanged } from "../utils/entriesEvents";
import { formatCurrency, formatDate } from "../utils/format";
import {
  buildMonthList,
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  getDefaultMonthRange,
} from "../utils/months";
import { monthToRange } from "../utils/dateRange";
import {
  formatPaymentMethodLabel,
  isPaymentMethodCredit,
} from "../utils/paymentMethods";
import { formatEntryInstallmentLabel } from "../utils/installments";
import { listCardsCached } from "../services/cardsService";
import type { CreditCard, Entry } from "../types";

const currentMonth = () => getCurrentMonthInTimeZone("America/Bahia");

const EntriesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMonthValue = useMemo(() => currentMonth(), []);
  const monthRange = useMemo(
    () =>
      getDefaultMonthRange({
        endMonth: currentMonthValue,
        monthsBack: 24,
        monthsAhead: 12,
      }),
    [currentMonthValue],
  );
  const [month, setMonth] = useState(currentMonthValue);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [entries, setEntries] = useState<Entry[] | unknown>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entriesPollingEnabled, setEntriesPollingEnabled] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [isMonthPanelOpen, setIsMonthPanelOpen] = useState(false);

  const selectedMonthRange = useMemo(() => monthToRange(month), [month]);
  const monthLabel = useMemo(() => formatMonthLabel(month), [month]);
  const monthOptions = useMemo(
    () =>
      buildMonthList({
        start: monthRange.start,
        end: monthRange.end,
      }),
    [monthRange.end, monthRange.start],
  );
  const toggleMonthPanel = useCallback(() => {
    setIsMonthPanelOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const state = location.state as { toast?: { message: string; type: "success" | "error" } };
    if (state?.toast) {
      setToast(state.toast);
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    let isActive = true;
    const loadCards = async () => {
      try {
        const data = await listCardsCached();
        if (isActive) {
          setCards(data);
        }
      } catch {
        if (isActive) {
          setCards([]);
        }
      }
    };

    loadCards();

    return () => {
      isActive = false;
    };
  }, []);

  const loadEntries = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
    const data = await listEntries({
      from: selectedMonthRange.from,
      to: selectedMonthRange.to,
    });

        const safeData = Array.isArray(data) ? data : [];
        const sorted = [...safeData].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setEntries(sorted);
        setError(null);
      } catch (err) {
        const errorWithStatus = err as Error & { status?: number };
        const status = errorWithStatus?.status;
        const isServerError = typeof status === "number" && status >= 500;
        const message = isServerError
          ? "Erro ao carregar lançamentos"
          : err instanceof Error
          ? err.message
          : "Erro ao carregar os lancamentos.";
        if (isServerError) {
          setEntriesPollingEnabled(false);
        }
        if (!silent) {
          setError(message);
          setEntries([]);
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [selectedMonthRange],
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const refresh = () => {
      if (!entriesPollingEnabled) return;
      loadEntries({ silent: true });
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener(ENTRIES_CHANGED, refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener(ENTRIES_CHANGED, refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadEntries, entriesPollingEnabled]);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const totalAmount = useMemo(
    () => safeEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [safeEntries],
  );

  const formatCardLabel = (card: CreditCard) =>
    card.brand ? `${card.name} • ${card.brand}` : card.name;

  const badgeBaseClass =
    "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600";

  const renderPaymentBadge = (entry: Entry) => {
    const label = formatPaymentMethodLabel(entry.paymentMethod);
    if (!label) return null;
    return <span className={badgeBaseClass}>{label}</span>;
  };

  const getCardBadge = (entry: Entry) => {
    if (!entry.cardId) return null;
    const card = cardsById.get(entry.cardId);
    const label = card ? formatCardLabel(card) : "Cartao";
    const dotColor = card?.color ?? "#94a3b8";
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <span>{label}</span>
      </span>
    );
  };

  const formatInstallmentLabel = (entry: Entry) => {
    const label = formatEntryInstallmentLabel(entry);
    return label ? ` (${label})` : "";
  };

  const renderEntryBadges = (entry: Entry) => {
    const methodBadge = renderPaymentBadge(entry);
    const shouldShowCard = isPaymentMethodCredit(entry.paymentMethod);
    const cardBadge = shouldShowCard ? getCardBadge(entry) : null;
    const installmentBadge = entry.installmentGroupId ? (
      <span className={badgeBaseClass}>Parcelado</span>
    ) : null;
    if (!methodBadge && !cardBadge && !installmentBadge) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {methodBadge}
        {cardBadge}
        {installmentBadge}
      </div>
    );
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteEntry(entryToDelete.id);
      setEntries((prev: Entry[] | unknown) => {
        const current = Array.isArray(prev) ? prev : [];
        return current.filter((item) => item.id !== entryToDelete.id);
      });
      notifyEntriesChanged();
      setToast({ message: "Lancamento removido", type: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao remover lancamento.";
      setToast({ message, type: "error" });
    } finally {
      setIsDeleting(false);
      setEntryToDelete(null);
    }
  };

  const handleRetryEntries = useCallback(() => {
    setEntriesPollingEnabled(true);
    loadEntries();
  }, [loadEntries]);

  const handleDeleteClick = (entry: Entry) => {
    setEntryToDelete(entry);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-900">Lancamentos</h2>
        <p className="text-sm text-slate-600">
          Use o Assistente para registrar novas despesas e acompanhe os registros abaixo.
        </p>
      </div>
      <div className="grid gap-3">
        <div className="relative flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span className="text-xs font-semibold uppercase text-slate-500">Mes</span>
          <div>
            <button
              type="button"
              aria-expanded={isMonthPanelOpen}
              aria-controls="entries-month-panel"
              onClick={toggleMonthPanel}
              className="group mt-1 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-semibold text-slate-900 shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <span>{monthLabel}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:border-purple-300 group-hover:text-purple-600">
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 transition ${isMonthPanelOpen ? "rotate-180" : "rotate-0"}`}
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
            <MonthChipsBar
              id="entries-month-panel"
              open={isMonthPanelOpen}
              valueMonth={month}
              months={monthOptions}
              onSelect={setMonth}
              onClose={() => setIsMonthPanelOpen(false)}
            />
          </div>
        </div>
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
          <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRetryEntries}
              className="mt-2 inline-flex items-center rounded bg-white px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
      <div className="mt-4 space-y-1 md:hidden">
          {safeEntries.length ? (
            safeEntries.map((entry) => {
              const descriptionLabel = `${entry.description}${formatInstallmentLabel(entry)}`;
              return (
                <div
                  key={entry.id}
                  className="border-b border-slate-100 bg-white px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{descriptionLabel}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(entry.amount)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {formatDate(entry.date)} • {entry.category}
                      {entry.categoryInferred && (
                        <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                          auto
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      {renderPaymentBadge(entry)}
                      {entry.source && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {entry.source}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
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
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeEntries.length ? (
                    safeEntries.map((entry) => {
                      const descriptionLabel = `${entry.description}${formatInstallmentLabel(entry)}`;
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div className="flex flex-col gap-1">
                              <span>{descriptionLabel}</span>
                              {renderEntryBadges(entry)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDate(entry.date)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <span className="inline-flex items-center gap-2">
                              <span>{entry.category}</span>
                              {entry.categoryInferred && (
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                                  auto
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{entry.source}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                to={`/entries/${entry.id}/edit`}
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(entry)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-500" colSpan={6}>
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

      <ConfirmDialog
        open={Boolean(entryToDelete)}
        title="Confirmar exclusao"
        description="Tem certeza? Essa acao nao pode ser desfeita."
        confirmLabel={isDeleting ? "Removendo..." : "Excluir"}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !isDeleting && setEntryToDelete(null)}
      />

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

export default EntriesPage;
