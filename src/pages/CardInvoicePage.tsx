import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getCardInvoiceByMonth } from "../api/cards";
import { formatBRL, formatDate } from "../utils/format";
import { formatMonthLabel, getCurrentMonthInTimeZone, shiftMonth } from "../utils/months";
import type { InvoiceDetails, InvoicePurchase } from "../types";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

const normalizeMonthValue = (value?: string, fallback?: string) => {
  if (!value) return fallback ?? "";
  const trimmed = value.trim();
  if (MONTH_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return fallback ?? trimmed;
};

const formatDayLabel = (value: string) => {
  if (value === "sem-data") {
    return "Sem data";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const weekday = WEEKDAY_FORMATTER.format(parsed);
  const day = String(parsed.getDate());
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}`;
};

const buildStatusLabel = (invoice?: InvoiceDetails) => {
  if (!invoice) return "—";
  if (invoice.status) {
    const raw = invoice.status.trim();
    const lower = raw.toLowerCase();
    if (lower.includes("paid") || lower.includes("paga")) return "Paga";
    if (lower.includes("open") || lower.includes("aberta")) return "Aberta";
    return raw;
  }
  const remaining = invoice.remaining ?? invoice.invoiceTotal ?? 0;
  return remaining > 0 ? "Aberta" : "Paga";
};

type DayGroup = {
  key: string;
  label: string;
  purchases: InvoicePurchase[];
};

const CardInvoicePage = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const fallbackMonth = getCurrentMonthInTimeZone("America/Bahia");
  const requestedMonth = searchParams.get("month");
  const normalizedMonth = normalizeMonthValue(requestedMonth ?? undefined, fallbackMonth);

  useEffect(() => {
    if (!requestedMonth || requestedMonth.trim() !== normalizedMonth) {
      setSearchParams({ month: normalizedMonth }, { replace: true });
    }
  }, [requestedMonth, normalizedMonth, setSearchParams]);

  useEffect(() => {
    if (!cardId) {
      setInvoice(null);
      setError("Cartão não informado.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getCardInvoiceByMonth(cardId, normalizedMonth)
      .then((data) => {
        if (!active) return;
        setInvoice(data);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Erro ao carregar o resumo da fatura.";
        setError(message);
        setInvoice(null);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [cardId, normalizedMonth]);

  useEffect(() => {
    setSearchValue("");
  }, [cardId, normalizedMonth]);

  const filteredPurchases = useMemo(() => {
    if (!invoice?.purchases?.length) return [];
    const query = searchValue.trim().toLowerCase();
    if (!query) return invoice.purchases;
    return invoice.purchases.filter((purchase) =>
      purchase.description.toLowerCase().includes(query),
    );
  }, [invoice?.purchases, searchValue]);

  const groupedPurchases = useMemo<DayGroup[]>(() => {
    if (!filteredPurchases.length) return [];
    const buckets = new Map<string, InvoicePurchase[]>();
    filteredPurchases.forEach((purchase) => {
      const key = purchase.date ? purchase.date.slice(0, 10) : "sem-data";
      const list = buckets.get(key) ?? [];
      buckets.set(key, [...list, purchase]);
    });
    buckets.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      });
      buckets.set(key, sorted);
    });
    const entries = Array.from(buckets.entries());
    entries.sort((a, b) => {
      if (a[0] === "sem-data") return 1;
      if (b[0] === "sem-data") return -1;
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
    return entries.map(([key, purchases]) => ({
      key,
      label: formatDayLabel(key),
      purchases,
    }));
  }, [filteredPurchases]);

  const cardLabel = invoice?.cardName ?? invoice?.card?.name ?? "Cartão de crédito";
  const valueAmount = invoice?.remaining ?? invoice?.invoiceTotal;
  const valueLabel = valueAmount !== undefined ? formatBRL(valueAmount) : "—";
  const closingLabel = invoice?.cycleEnd ? formatDate(invoice.cycleEnd) : "—";
  const dueLabel = invoice?.dueDate ? formatDate(invoice.dueDate) : "—";
  const statusLabel = buildStatusLabel(invoice);
  const prevMonth = shiftMonth(normalizedMonth, -1);
  const nextMonth = shiftMonth(normalizedMonth, 1);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/cards");
    }
  };

  const changeMonth = (target: string) => {
    setSearchParams({ month: target });
  };

  const renderPurchases = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2 rounded-2xl border border-slate-100 p-3">
              <div className="h-3 w-32 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full bg-slate-200" />
                  <div className="h-2 w-1/2 rounded-full bg-slate-200" />
                </div>
                <div className="h-3 w-16 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      );
    }
    if (!invoice) {
      return <p className="text-sm text-slate-500">Nenhum dado disponível.</p>;
    }
    if (!filteredPurchases.length) {
      if (searchValue.trim()) {
        return (
          <p className="text-sm text-slate-500">
            Nenhuma compra encontrada para “{searchValue.trim()}”.
          </p>
        );
      }
      return <p className="text-sm text-slate-500">Nenhuma compra neste ciclo.</p>;
    }
    return (
      <div className="space-y-5">
        {groupedPurchases.map((group) => (
          <div key={group.key} className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              {group.label}
            </p>
            <ul className="space-y-2">
              {group.purchases.map((purchase) => (
                <li
                  key={purchase.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                      >
                        <path d="M4 7h12v6H4z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 10h12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {purchase.description}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        Cartão de crédito • {cardLabel}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatBRL(purchase.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300"
          aria-label="Voltar"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm font-semibold uppercase tracking-[0.3em] text-slate-700">
          {cardLabel}
        </span>
        <button
          type="button"
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300"
          aria-label="Mais opções"
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        <button
          type="button"
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300"
          onClick={() => changeMonth(prevMonth)}
          aria-label="Mês anterior"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mês</p>
          <p className="text-base font-semibold text-slate-900">
            {formatMonthLabel(normalizedMonth)}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300"
          onClick={() => changeMonth(nextMonth)}
          aria-label="Próximo mês"
        >
          →
        </button>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Valor da fatura
            </p>
            <p className="text-2xl font-semibold text-slate-900">{valueLabel}</p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
            {statusLabel}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Fechamento</p>
            <p className="text-sm font-semibold text-slate-900">{closingLabel}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Vencimento</p>
            <p className="text-sm font-semibold text-slate-900">{dueLabel}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Situação</p>
            <p className="text-sm font-semibold text-slate-900">{statusLabel}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Compras</h2>
            <p className="text-xs text-slate-500">Lista de lançamentos do ciclo</p>
          </div>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Buscar"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-64"
          />
        </div>
        {renderPurchases()}
      </section>
    </div>
  );
};

export default CardInvoicePage;
