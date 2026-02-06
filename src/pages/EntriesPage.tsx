import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteEntry } from "../api/entries";
import MonthChipsBar from "../components/MonthChipsBar";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import { notifyEntriesChanged } from "../utils/entriesEvents";
import { DATA_CHANGED_EVENT, type DataChangedDetail } from "../utils/dataBus";
import { formatCurrency, formatDate } from "../utils/format";
import {
  buildMonthList,
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  getDefaultMonthRange,
} from "../utils/months";
import {
  formatPaymentMethodLabel,
  isPaymentMethodCredit,
} from "../utils/paymentMethods";
import { formatEntryInstallmentLabel } from "../utils/installments";
import { listCardsCached } from "../services/cardsService";
import type { CreditCard, Entry } from "../types";
import { useEntries } from "../hooks/queries";

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
  const [entriesPollingEnabled, setEntriesPollingEnabled] = useState(true);
  const {
    data: entriesData,
    isLoading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries,
  } = useEntries(month, { pollIntervalMs: entriesPollingEnabled ? 20_000 : 0 });
  const safeEntries = Array.isArray(entriesData) ? entriesData : [];
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [isMonthPanelOpen, setIsMonthPanelOpen] = useState(false);
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
    const refresh = () => {
      if (!entriesPollingEnabled) return;
      void refetchEntries();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<DataChangedDetail>).detail;
      const matchesMonth = !detail.month || detail.month === month;
      if (matchesMonth && (detail.scope === "all" || detail.scope === "entries")) {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [entriesPollingEnabled, refetchEntries, month]);

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


  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const totalAmount = useMemo(
    () => safeEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [safeEntries],
  );
  const hasEntries = safeEntries.length > 0;
  const isInitialLoading = entriesLoading && !hasEntries;

  const formatCardLabel = (card: CreditCard) =>
    card.brand ? `${card.name} • ${card.brand}` : card.name;

  const badgeBaseClass =
    "inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]";
  const cardBadgeClass =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]";

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
      <span className={cardBadgeClass}>
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
      notifyEntriesChanged();
      void refetchEntries();
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
    void refetchEntries();
  }, [refetchEntries]);

  const handleEditEntry = (entryId: string) => {
    navigate(`/entries/${entryId}/edit`);
  };

  const skeletonEntries = Array.from({ length: 3 }).map((_, index) => (
    <div
      key={`mobile-skeleton-${index}`}
      className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 last:border-b-0 animate-pulse"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-32 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
        <div className="h-4 w-24 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </div>
      <div className="mt-2 flex flex-col gap-2 text-xs">
        <div className="h-3 w-40 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
        <div className="h-3 w-24 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </div>
    </div>
  ));

  const skeletonTableRows = Array.from({ length: 3 }).map((_, index) => (
    <tr key={`table-skeleton-${index}`} className="divide-y divide-[var(--border)] animate-pulse">
      <td className="px-4 py-4">
        <div className="h-3 w-36 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-24 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-28 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-20 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-16 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-16 rounded-full bg-slate-700/40 dark:bg-slate-600/40" />
      </td>
    </tr>
  ));

  const handleDeleteClick = (entry: Entry) => {
    setEntryToDelete(entry);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-[var(--text)]">Lancamentos</h2>
        <p className="text-sm text-[var(--muted)]">
          Use o Assistente para registrar novas despesas e acompanhe os registros abaixo.
        </p>
      </div>
          <div className="grid gap-3">
        <div className="relative flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
          <span className="text-xs font-semibold uppercase text-[var(--muted)]">Mes</span>
          <div>
            <button
              type="button"
              aria-expanded={isMonthPanelOpen}
              aria-controls="entries-month-panel"
              onClick={toggleMonthPanel}
              className="group mt-1 inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-base font-semibold text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            >
              <span>{monthLabel}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-sm transition group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
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
          <p className="text-sm text-[var(--muted)]">
            {safeEntries.length} lancamento(s) - Total {formatCurrency(totalAmount)}
          </p>
        </div>

        {entriesError && (
            <div className="mt-3 rounded-lg border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-sm text-rose-200">
              <p>{entriesError.message}</p>
              <button
                type="button"
                onClick={handleRetryEntries}
                className="mt-2 inline-flex items-center rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--danger)] transition hover:bg-[var(--surface-2)]"
              >
                Tentar novamente
              </button>
            </div>
        )}

        {!entriesError && (
          <>
            {isInitialLoading ? (
              <>
                <div className="mt-4 space-y-1 md:hidden">{skeletonEntries}</div>
                <div className="mt-4 hidden overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] md:block">
                  <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                    <thead className="bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">Descricao</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">{skeletonTableRows}</tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 space-y-1 md:hidden">
                  {hasEntries ? (
                    safeEntries.map((entry) => {
                      const descriptionLabel = `${entry.description}${formatInstallmentLabel(
                        entry,
                      )}`;
                      return (
                        <div
                          key={entry.id}
                          className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--text)]">
                              {descriptionLabel}
                            </p>
                            <p className="text-sm font-semibold text-[var(--text)]">
                              {formatCurrency(entry.amount)}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-col gap-1 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                            <span>
                              {formatDate(entry.date)} • {entry.category}
                              {entry.categoryInferred && (
                                <span className="ml-2 inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                                  auto
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              {renderPaymentBadge(entry)}
                              {entry.source && (
                                <span className="text-[10px] font-semibold text-[var(--muted)]">
                                  {entry.source}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
                            <button
                              type="button"
                              onClick={() => handleEditEntry(entry.id)}
                              className="text-[var(--muted)] transition hover:text-[var(--primary)]"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(entry)}
                              className="text-rose-400 transition hover:text-rose-300"
                            >
                              🗑️ Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Nenhum lancamento encontrado.</p>
                  )}
                </div>

                <div className="mt-4 hidden overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] md:block">
                  <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                    <thead className="bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3">Descricao</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {hasEntries ? (
                        safeEntries.map((entry) => {
                          const descriptionLabel = `${entry.description}${formatInstallmentLabel(
                            entry,
                          )}`;
                          return (
                            <tr
                              key={entry.id}
                              className="group transition-colors hover:bg-[var(--surface-2)]"
                            >
                              <td className="px-4 py-3 font-medium text-[var(--text)]">
                                <div className="flex flex-col gap-1">
                                  <span>{descriptionLabel}</span>
                                  {renderEntryBadges(entry)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[var(--muted)]">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-4 py-3 text-[var(--muted)]">
                                <span className="inline-flex items-center gap-2">
                                  <span>{entry.category}</span>
                                  {entry.categoryInferred && (
                                    <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                                      auto
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[var(--muted)]">{entry.source}</td>
                              <td className="px-4 py-3 text-right font-semibold text-[var(--text)] text-lg">
                                {formatCurrency(entry.amount)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => handleEditEntry(entry.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-[var(--muted)] transition hover:border hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)]"
                                  >
                                    ✏️
                                    <span className="sr-only">Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(entry)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-rose-400 transition hover:bg-rose-50 hover:text-rose-300"
                                  >
                                    🗑️
                                    <span className="sr-only">Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            className="px-4 py-4 text-sm text-[var(--muted)]"
                            colSpan={6}
                          >
                            Nenhum lancamento encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
