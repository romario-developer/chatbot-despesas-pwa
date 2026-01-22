import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatBRL, formatDate } from "../utils/format";
import { formatMonthLabel } from "../utils/months";
import { getCardInvoiceDetails } from "../api/cards";
import type { InvoiceDetails, InvoicePurchase } from "../types";

const formatCycleMonthLabel = (cycleEnd?: string) => {
  if (!cycleEnd) return undefined;
  const candidate = cycleEnd.trim().slice(0, 7);
  if (candidate.length !== 7) {
    return undefined;
  }
  return formatMonthLabel(candidate);
};

const InvoiceDetailsPage = () => {
  const { cardId, cycleEnd } = useParams<{ cardId: string; cycleEnd: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!cardId || !cycleEnd) {
      setInvoice(null);
      setError("Dados da fatura ausentes.");
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);
    getCardInvoiceDetails(cardId, cycleEnd)
      .then((data) => {
        if (isMounted) {
          setInvoice(data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "Erro ao carregar o detalhe da fatura.";
        setError(message);
        setInvoice(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [cardId, cycleEnd]);

  useEffect(() => {
    setSearch("");
  }, [cardId, cycleEnd]);

  const filteredPurchases = useMemo<InvoicePurchase[]>(() => {
    if (!invoice) return [];
    const query = search.trim().toLowerCase();
    if (!query) return invoice.purchases;
    return invoice.purchases.filter((purchase) =>
      purchase.description.toLowerCase().includes(query),
    );
  }, [invoice, search]);

  const headerMonthLabel = formatCycleMonthLabel(invoice?.cycleEnd);
  const cardLabel = invoice?.cardName ?? invoice?.card?.name ?? "Fatura";
  const valueAmount = invoice?.remaining ?? invoice?.invoiceTotal;
  const valueLabel = valueAmount !== undefined ? formatBRL(valueAmount) : "—";
  const closingDateLabel = invoice?.cycleEnd ? formatDate(invoice.cycleEnd) : "—";
  const dueDateLabel = invoice?.dueDate ? formatDate(invoice.dueDate) : "—";

  const renderPurchases = () => {
    if (loading) {
      return <p className="text-sm text-slate-500">Carregando compras...</p>;
    }
    if (error) {
      return (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      );
    }
    if (!invoice) {
      return <p className="text-sm text-slate-500">Nenhum dado disponivel.</p>;
    }
    if (!invoice.purchases.length) {
      return (
        <p className="text-sm text-slate-500">Nenhuma compra registrada neste ciclo.</p>
      );
    }

    if (!filteredPurchases.length) {
      return (
        <p className="text-sm text-slate-500">
          Nenhuma compra encontrada para &quot;{search.trim()}&quot;.
        </p>
      );
    }

    return (
      <ul className="space-y-3">
        {filteredPurchases.map((purchase) => (
          <li
            key={purchase.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{purchase.description}</p>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                <span>{purchase.category ?? "Sem categoria"}</span>
                {purchase.date && <span>{formatDate(purchase.date)}</span>}
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {formatBRL(purchase.amount)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detalhe da fatura
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            {cardLabel}
          </h1>
          {headerMonthLabel && (
            <p className="text-sm text-slate-500">{headerMonthLabel}</p>
          )}
        </div>
        <Link
          to="/cards"
          className="text-sm font-semibold text-primary underline-offset-4 transition hover:text-primary/70"
        >
          Voltar para cartões e faturas
        </Link>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Valor da fatura
            </p>
            <p className="text-2xl font-semibold text-slate-900">{valueLabel}</p>
          </div>
          {invoice?.status && (
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
              {invoice.status}
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Fechamento</p>
            <p className="text-sm font-semibold text-slate-900">{closingDateLabel}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Vencimento</p>
            <p className="text-sm font-semibold text-slate-900">{dueDateLabel}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">Status</p>
            <p className="text-sm font-semibold text-slate-900">
              {invoice?.status ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Compras</h2>
            <p className="text-xs text-slate-500">Lista de lançamentos do ciclo</p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por descrição"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30 sm:w-64"
          />
        </div>
        {renderPurchases()}
      </section>
    </div>
  );
};

export default InvoiceDetailsPage;
