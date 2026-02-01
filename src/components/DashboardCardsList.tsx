import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCardInvoices, listCards } from "../api/cards";
import { getCurrentMonthInTimeZone } from "../utils/months";
import { formatBRL } from "../utils/format";
import type { CardInvoice, CreditCard } from "../types";

const MAX_VISIBLE_CARDS = 3;

type DashboardCardsListProps = {
  month?: string;
};

const DashboardCardsList = ({ month }: DashboardCardsListProps) => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<CardInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cardsResponse, invoicesResponse] = await Promise.all([
          listCards(),
          listCardInvoices({ scope: "open" }),
        ]);
        if (!active) return;
        setCards(cardsResponse.cards);
        setInvoices(invoicesResponse);
      } catch (loadError) {
        // eslint-disable-next-line no-console
        console.error("[dashboard] failed to load cards list", loadError);
        if (active) {
          setError("Não foi possível carregar cartões");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const invoicesByCard = useMemo(() => {
    const map = new Map<string, CardInvoice>();
    invoices.forEach((invoice) => {
      if (!map.has(invoice.cardId)) {
        map.set(invoice.cardId, invoice);
      }
    });
    return map;
  }, [invoices]);

  const rows = useMemo(
    () =>
      cards.map((card) => ({
        card,
        invoice: invoicesByCard.get(card.id),
      })),
    [cards, invoicesByCard],
  );

  const visibleRows = rows.slice(0, MAX_VISIBLE_CARDS);
  const hasMore = cards.length > MAX_VISIBLE_CARDS;
  const targetMonth = month ?? getCurrentMonthInTimeZone("America/Bahia");

  const handleCardClick = (cardId: string) => {
    const encodedId = encodeURIComponent(cardId);
    navigate(`/cards/${encodedId}/invoice?month=${targetMonth}`);
  };

  const handleAddCard = () => {
    navigate("/cards");
  };

  const handleSeeAll = () => {
    navigate("/cards");
  };

  const renderDatesLine = (invoice?: CardInvoice) => {
    if (!invoice) return null;
    if (typeof invoice.closingDay === "number" && typeof invoice.dueDay === "number") {
      return `Fecha dia ${invoice.closingDay} · Vence dia ${invoice.dueDay}`;
    }
    return null;
  };

  const statusLabel = (isOpen: boolean) =>
    isOpen ? "Não pago" : "Pago";
  const statusColor = (isOpen: boolean) =>
    isOpen ? "text-[var(--danger)]" : "text-[var(--success)]";

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-[var(--text-primary)]">Cartões</h4>
        {(hasMore || cards.length > 0) && (
          <button
            type="button"
            onClick={handleSeeAll}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[var(--text-muted)] transition hover:text-[var(--primary)]"
          >
            Ver todos
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          [0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-12 animate-pulse rounded-2xl bg-[var(--surface-2)]"
            />
          ))
        ) : error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : !cards.length ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text-primary)]">Nenhum cartão cadastrado ainda.</p>
            <p className="text-xs text-[var(--text-muted)]">Adicione um cartão para monitorar faturas e limites.</p>
            <button
              type="button"
              onClick={handleAddCard}
              className="mt-3 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Cadastrar cartão
            </button>
          </div>
        ) : (
          visibleRows.map(({ card, invoice }) => {
            const remaining = invoice?.remaining ?? 0;
            const isOpen = remaining > 0;
            const datesLine = renderDatesLine(invoice);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card.id)}
                aria-label={`Abrir cartão ${card.name}`}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-safe:duration-200 motion-safe:ease-out"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] shadow-inner transition group-hover:shadow-sm">
                    <span className="relative h-5 w-5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="absolute inset-0 h-5 w-5 text-[var(--text-muted)]"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 7h16v10H4z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path d="M4 11h16" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">
                      {card.name}
                    </p>
                    {datesLine && (
                      <p className="text-[11px] text-[var(--text-muted)] leading-snug">{datesLine}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {formatBRL(Math.max(remaining, 0))}
                  </p>
                  <span className={`text-[0.65rem] uppercase tracking-[0.3em] ${statusColor(isOpen)}`}>
                    {statusLabel(isOpen)}
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4 text-[var(--text-muted)]"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

export default DashboardCardsList;
