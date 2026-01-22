import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "../utils/format";
import { formatMonthLabel, getCurrentMonthInTimeZone } from "../utils/months";
import {
  buildInvoicesPath,
  getCardInvoices,
  getCreditExpensesByCardAndRange,
  deleteCard,
  listCards,
} from "../api/cards";
import { getReadableTextColor } from "../utils/colors";
import type { CardInvoice, CreditCard, Entry } from "../types";
import { ENTRIES_CHANGED } from "../utils/entriesEvents";

const formatCycleRange = (start?: string, end?: string) => {
  if (start && end) {
    return `${formatDate(start)} - ${formatDate(end)}`;
  }
  if (start) return `A partir de ${formatDate(start)}`;
  if (end) return `Até ${formatDate(end)}`;
  return "";
};

const buildMonthRange = (value?: string) => {
  if (!value) return null;
  const [year, monthPart] = value.split("-");
  if (!year || !monthPart) return null;
  const normalizedMonth = monthPart.padStart(2, "0");
  const from = `${year}-${normalizedMonth}-01`;
  const monthNumber = Number(normalizedMonth);
  if (!Number.isFinite(monthNumber)) {
    return { from };
  }
  const lastDay = new Date(Number(year), monthNumber, 0);
  const day = String(lastDay.getDate()).padStart(2, "0");
  const to = `${year}-${normalizedMonth}-${day}`;
  return { from, to };
};

const getDueDateFromCycle = (cycleEnd: string, dueDay: number) => {
  const parsedCycle = new Date(cycleEnd);
  if (Number.isNaN(parsedCycle.getTime()) || !Number.isFinite(dueDay)) {
    return undefined;
  }
  const year = parsedCycle.getFullYear();
  const month = parsedCycle.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, dueDay), lastDayOfMonth);
  const monthString = String(month + 1).padStart(2, "0");
  const dayString = String(safeDay).padStart(2, "0");
  return `${year}-${monthString}-${dayString}`;
};

const getInvoiceDueLabel = (invoice: CardInvoice, card?: CreditCard) => {
  if (invoice?.dueDate) {
    return formatDate(invoice.dueDate);
  }
  const dueDay = invoice?.dueDay ?? card?.dueDay;
  if (!invoice?.cycleEnd || dueDay === undefined || dueDay === null) {
    return undefined;
  }
  const computed = getDueDateFromCycle(invoice.cycleEnd, dueDay);
  if (!computed) return undefined;
  return formatDate(computed);
};

const isCreditDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("DEBUG_CREDIT") === "1";
};

const logCreditDebug = (...args: unknown[]) => {
  if (!isCreditDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[credit-debug]", ...args);
};

const CARD_EDIT_KEY = "pendingEditCard";

const CreditPage = () => {
  const currentMonth = useMemo(
    () => getCurrentMonthInTimeZone("America/Bahia"),
    [],
  );
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<CardInvoice[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Entry[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  const monthRange = useMemo(() => buildMonthRange(month), [month]);
  const asOf = useMemo(() => (month ? `${month}-15` : undefined), [month]);
  const monthLabel = useMemo(() => formatMonthLabel(month), [month]);

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    setCardsError(null);
    try {
      const result = await listCards();
      logCreditDebug(
        "GET /api/cards",
        "status",
        result.status,
        "cardsCount",
        result.cards.length,
      );
      setCards(result.cards);
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? "unknown";
      logCreditDebug("GET /api/cards", "status", status, "error", error);
      const message =
        error instanceof Error ? error.message : "Erro ao carregar cartoes.";
      setCardsError(message);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const handleEditCard = useCallback(
    (cardId: string) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(CARD_EDIT_KEY, cardId);
      navigate("/cards");
    },
    [navigate],
  );

  const handleViewInvoiceDetail = useCallback(
    (cardId: string, cycleEnd?: string) => {
      if (!cycleEnd) return;
      navigate(`/credit/cards/${cardId}/invoices/${encodeURIComponent(cycleEnd)}`);
    },
    [navigate],
  );

  const handleCardClick = useCallback(
    (cardId: string, cycleEnd?: string) => {
      setSelectedCardId(cardId);
      handleViewInvoiceDetail(cardId, cycleEnd);
    },
    [handleViewInvoiceDetail],
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (typeof window === "undefined") return;
      if (!window.confirm("Tem certeza que deseja remover este cartao?")) return;
      setDeletingCardId(cardId);
      setCardsError(null);
      try {
        await deleteCard(cardId);
        logCreditDebug("DELETE /api/cards", "cardId", cardId);
        await loadCards();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao remover cartao.";
        setCardsError(message);
        logCreditDebug("DELETE /api/cards", "cardId", cardId, "error", message);
      } finally {
        setDeletingCardId(null);
      }
    },
    [loadCards],
  );

  const loadInvoices = useCallback(async () => {
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      const params: { asOf?: string; month?: string } = {};
      if (asOf) {
        params.asOf = asOf;
      }
      if (month) {
        params.month = month;
      }
      const invoicePath = buildInvoicesPath(params);
      logCreditDebug("selected month", month ?? "n/a");
      logCreditDebug("invoice url", invoicePath);
      const data = await getCardInvoices(params);
      if (isCreditDebugEnabled()) {
        // eslint-disable-next-line no-console
        console.log("[credit-debug] invoiceResponse", data);
      }
      logCreditDebug("invoice payload size", data.length);
      logCreditDebug("invoice payload first", data[0] ?? null);
      logCreditDebug("invoices payload", data);
      setInvoices(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar faturas.";
      setInvoiceError(message);
      setInvoices([]);
    } finally {
      setInvoiceLoading(false);
    }
  }, [asOf, month]);

  const invoicesByCardId = useMemo(() => {
    const map: Record<string, CardInvoice> = {};
    invoices.forEach((invoice) => {
      if (invoice.cardId) {
        map[invoice.cardId] = invoice;
      }
    });
    return map;
  }, [invoices]);

  const selectedInvoice = useMemo(
    () => (selectedCardId ? invoicesByCardId[selectedCardId] : undefined),
    [invoicesByCardId, selectedCardId],
  );

  const selectedCycleStart = selectedInvoice?.cycleStart;
  const selectedCycleEnd = selectedInvoice?.cycleEnd;

  const loadExpenses = useCallback(async () => {
    if (!selectedCardId) {
      setExpenses([]);
      setExpensesError(null);
      return;
    }

    const from = selectedCycleStart ?? monthRange?.from;
    const to = selectedCycleEnd ?? monthRange?.to;

    if (!from || !to) {
      setExpenses([]);
      setExpensesError(null);
      return;
    }

    setExpensesLoading(true);
    setExpensesError(null);
    try {
      const data = await getCreditExpensesByCardAndRange({
        cardId: selectedCardId,
        from,
        to,
      });
      const sorted = [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setExpenses(sorted);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar despesas.";
      setExpensesError(message);
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  }, [selectedCardId, selectedCycleStart, selectedCycleEnd, monthRange]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    const resetSelection = () => {
      setSelectedCardId((prev) => {
        if (!cards.length) return null;
        if (prev && cards.some((card) => card.id === prev)) {
          return prev;
        }
        return cards[0].id;
      });
    };
    resetSelection();
  }, [cards]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = () => {
      loadCards();
      loadInvoices();
      loadExpenses();
    };
    window.addEventListener(ENTRIES_CHANGED, handler);
    return () => {
      window.removeEventListener(ENTRIES_CHANGED, handler);
    };
  }, [loadCards, loadInvoices, loadExpenses]);

  const selectedCard = useMemo(
    () => (selectedCardId ? cards.find((card) => card.id === selectedCardId) ?? null : null),
    [cards, selectedCardId],
  );

  useEffect(() => {
    if (!cards.length) return;
    logCreditDebug("render cards", cards);
  }, [cards]);

  const cycleLabel = formatCycleRange(
    selectedInvoice?.cycleStart,
    selectedInvoice?.cycleEnd,
  );
  const selectedInvoiceCycleEndLabel = selectedInvoice?.cycleEnd
    ? formatDate(selectedInvoice.cycleEnd)
    : undefined;
  const selectedInvoiceDueLabel = selectedInvoice
    ? getInvoiceDueLabel(selectedInvoice, selectedCard ?? undefined)
    : undefined;
  const showNoInvoicesMessage =
    !invoiceLoading && !invoiceError && cards.length > 0 && invoices.length === 0;


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Credito e faturas</h1>
          <p className="text-sm text-slate-500">Mes selecionado: {monthLabel}.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase text-slate-500">Mes</label>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Cartoes disponiveis</h2>
          <span className="text-xs font-semibold uppercase text-slate-500">
            {cards.length} cartoes
          </span>
        </div>
        {invoiceLoading && (
          <p className="text-xs text-slate-500">Atualizando faturas...</p>
        )}
        {cardsError && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {cardsError}
          </div>
        )}
        {cardsLoading && !cards.length ? (

          <p className="text-sm text-slate-500">Carregando cartoes...</p>

        ) : cards.length ? (

          <>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {cards.map((card) => {
              const invoice = invoicesByCardId[card.id];
              const isActive = card.id === selectedCardId;
              const entriesCount = invoice?.entriesCount ?? 0;
              const cardCycleLabel = formatCycleRange(
                invoice?.cycleStart,
                invoice?.cycleEnd,
              );
              const displayCard = invoice?.card
                ? { ...card, ...invoice.card }
                : card;
              if (!invoice?.card) {
                logCreditDebug("invoice missing card payload", card.id);
              }
              const invoiceAmount =
                invoice && invoice.remaining !== undefined && invoice.remaining !== null
                  ? invoice.remaining
                  : invoice?.invoiceTotal;
              const invoiceAmountLabel =
                invoiceAmount !== undefined && invoiceAmount !== null ? formatBRL(invoiceAmount) : "—";
              const cycleEndLabel = invoice?.cycleEnd ? formatDate(invoice.cycleEnd) : undefined;
              const dueLabel = invoice ? getInvoiceDueLabel(invoice, displayCard) : undefined;
              const cardBackground = displayCard.color ?? "#ffffff";
              const cardTextColor = displayCard.textColor ?? getReadableTextColor(cardBackground);
              return (
                <div
                  key={card.id}
                  role="button"

                  tabIndex={0}

                onClick={() => handleCardClick(card.id, invoice?.cycleEnd)}

                onKeyDown={(event) => {

                  if (event.key === "Enter" || event.key === " ") {

                    event.preventDefault();

                    handleCardClick(card.id, invoice?.cycleEnd);

                  }

                }}

                  className={`group flex flex-col gap-3 rounded-3xl border p-4 text-left transition ${

                    isActive

                      ? "border-primary bg-primary/5 shadow-lg"

                      : "border-slate-200 bg-white hover:border-slate-300"

                  }`}

                  style={{ backgroundColor: cardBackground, color: cardTextColor }}

                >

                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-current">{displayCard.name}</p>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-current/70">
                        <span className="rounded-full border border-current/30 px-2 py-0.5">
                          {displayCard.brand ?? "Cartao"}
                        </span>
                        {displayCard.limit !== undefined && displayCard.limit !== null && (
                          <span className="text-[10px] text-current/70">
                            Limite {formatBRL(displayCard.limit)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {invoice?.status && (

                        <span className="rounded-full border border-current/30 px-3 py-1 text-[11px] font-semibold uppercase">

                          {invoice.status}

                        </span>

                      )}

                      <div className="flex gap-1">

                        <button

                          type="button"

                          onClick={(event) => {

                            event.stopPropagation();

                            handleEditCard(card.id);

                          }}

                          className="rounded-full border border-current/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition hover:border-current"

                        >

                          Editar

                        </button>

                        <button

                          type="button"

                          onClick={(event) => {

                            event.stopPropagation();

                            handleDeleteCard(card.id);

                          }}

                          disabled={deletingCardId === card.id}

                          className="rounded-full border border-current/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition hover:border-current disabled:opacity-50"

                        >

                          {deletingCardId === card.id ? "Excluindo" : "Excluir"}

                        </button>

                      </div>

                    </div>

                  </div>

                  <p className="text-xs text-current/70">Fatura atual</p>
                  <p className="text-2xl font-semibold text-current">{invoiceAmountLabel}</p>
                  {cycleEndLabel && (
                    <p className="text-xs text-current/70">Fecha em {cycleEndLabel}</p>
                  )}
                  {dueLabel && (
                    <p className="text-xs text-current/70">Vence em {dueLabel}</p>
                  )}
                  <p className="text-xs text-current/70">
                    Fechamento dia {displayCard.closingDay ?? "-"} · Vencimento dia {displayCard.dueDay ?? "-"}
                  </p>
                  <p className="text-xs text-current/70">Lancamentos: {entriesCount}</p>

                  {cardCycleLabel && (

                    <p className="text-xs text-current/70">Ciclo: {cardCycleLabel}</p>

                  )}

                  {(invoice?.paidTotal || invoice?.remaining) && (

                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-current/80">

                      {invoice?.paidTotal !== undefined && (

                        <span className="rounded-full border border-current/30 px-3 py-1">

                          Pago {formatBRL(invoice.paidTotal)}

                        </span>

                      )}

                      {invoice?.remaining !== undefined && (

                        <span className="rounded-full border border-current/30 px-3 py-1">

                          Restante {formatBRL(invoice.remaining)}

                        </span>

                      )}

                    </div>

                  )}

                </div>

              );

            })}

          </div>


            {showNoInvoicesMessage && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                Sem faturas neste mes.
              </div>
            )}

          </>

        ) : cardsError ? null : (

          <div className="rounded-3xl border border-dashed bg-white/80 p-6 text-center">

            <p className="text-sm text-slate-500">Nenhum cartao cadastrado ainda.</p>

            <Link

              to="/cards"

              className="mt-3 inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-xs font-semibold uppercase text-primary transition hover:bg-primary/10"

            >

              Cadastrar cartão

            </Link>

          </div>

        )}

      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Detalhe da fatura</h2>
            {selectedCard && (
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Cartao {selectedCard.name}
              </p>
            )}
          </div>
          <span className="text-xs font-semibold uppercase text-slate-500">{monthLabel}</span>
        </div>
        {invoiceError && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {invoiceError}
          </div>
        )}
        {cards.length === 0 ? (
          <p className="text-sm text-slate-500">Cadastre um cartao para acompanhar faturas.</p>
        ) : showNoInvoicesMessage ? (
          <p className="text-sm text-slate-500">Sem faturas neste mes.</p>
        ) : invoiceLoading ? (
          <p className="text-sm text-slate-500">Carregando fatura...</p>
        ) : !selectedInvoice ? (
          <p className="text-sm text-slate-500">Selecione um cartao para ver os detalhes.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Fatura total</p>
                <p className="text-xl font-semibold text-slate-900">
                  {formatBRL(selectedInvoice.invoiceTotal)}
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Lancamentos
                </p>
                <p className="text-xl font-semibold text-slate-900">
                  {selectedInvoice.entriesCount ?? expenses.length}
                </p>
              </div>
              {selectedInvoice.remaining !== undefined && (
                <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Restante</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatBRL(selectedInvoice.remaining)}
                  </p>
                </div>
              )}
              {selectedInvoice.paidTotal !== undefined && (
                <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Pago</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatBRL(selectedInvoice.paidTotal)}
                  </p>
                </div>
              )}
            </div>
            {cycleLabel && (
              <p className="text-xs text-slate-500">Ciclo: {cycleLabel}</p>
            )}
            {selectedInvoiceCycleEndLabel && (
              <p className="text-xs text-slate-500">Fecha em {selectedInvoiceCycleEndLabel}</p>
            )}
            {selectedInvoiceDueLabel && (
              <p className="text-xs text-slate-500">Vence em {selectedInvoiceDueLabel}</p>
            )}
            <div className="space-y-3">
              {expensesLoading ? (
                <p className="text-sm text-slate-500">Carregando despesas...</p>
              ) : expensesError ? (
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {expensesError}
                </div>
              ) : expenses.length ? (
                <ul className="space-y-2">
                  {expenses.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.description}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(entry.date)} • {entry.category || "Sem categoria"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatBRL(entry.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Nenhum lancamento de credito registrado neste ciclo.
                </p>
              )}
            </div>
          </>
        )}

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-sm font-semibold uppercase text-slate-500">Proximas faturas</h3>
          <p className="text-sm text-slate-500">
            Selecione um cartao para ver os proximos ciclos e manter o controle.
          </p>
        </div>
      </section>
    </div>
  );
};

export default CreditPage;





