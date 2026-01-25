import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCardInvoices, listCards } from "../api/cards";
import { getCurrentMonthInTimeZone } from "../utils/months";
import { formatBRL } from "../utils/format";
import type { CardInvoice, CreditCard } from "../types";

const MAX_VISIBLE_CARDS = 3;

const formatIndicatorLabel = (isOpen: boolean) => (isOpen ? "Em aberto" : "Tudo pago");

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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-slate-900">Cartões</h4>
        {(hasMore || cards.length > 0) && (
          <button
            type="button"
            onClick={handleSeeAll}
            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 transition hover:text-primary"
          >
            Ver todos
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          [0, 1, 2].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          ))
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : !cards.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p>Nenhum cartão cadastrado ainda.</p>
            <button
              type="button"
              onClick={handleAddCard}
              className="mt-2 inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:border-primary hover:text-primary"
            >
              Cadastrar cartão
            </button>
          </div>
        ) : (
          visibleRows.map(({ card, invoice }) => {
            const remaining = invoice?.remaining ?? 0;
            const isOpen = remaining > 0;
            const datesLine = renderDatesLine(invoice);
            const indicatorStyle = isOpen
              ? "bg-rose-50 text-rose-700 border-rose-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100";
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card.id)}
                aria-label={`Abrir cartão ${card.name}`}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-safe:duration-200 motion-safe:ease-out"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white text-xs font-bold uppercase tracking-[0.3em] text-slate-600 shadow-inner transition group-hover:shadow-sm">
                    <span className="relative h-5 w-5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="absolute inset-0 h-5 w-5 text-slate-500"
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
                    <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                      {card.name}
                    </p>
                    {datesLine && (
                      <p className="text-[11px] text-slate-500 leading-snug">{datesLine}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-bold text-slate-900">{formatBRL(Math.max(remaining, 0))}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] ${indicatorStyle}`}
                  >
                    {formatIndicatorLabel(isOpen)}
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4 text-slate-400"
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
