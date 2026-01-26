import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCardInvoiceSummary } from "../api/cards";
import { formatBRL, formatDate } from "../utils/format";
import { formatMonthLabel, getCurrentMonthInTimeZone, shiftMonth } from "../utils/months";
import type { CardInvoiceSummary } from "../types";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

const normalizeMonthValue = (value?: string, fallback?: string) => {
  if (!value) return fallback ?? "";
  const trimmed = value.trim();
  if (MONTH_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return fallback ?? trimmed;
};

const CardInvoicePage = () => {
  const params = useParams<{ cardId?: string; id?: string }>();
  const derivedCardId = params.cardId ?? params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackMonth = getCurrentMonthInTimeZone("America/Bahia");
  const requestedMonth = new URLSearchParams(location.search).get("month");
  const normalizedMonth = normalizeMonthValue(requestedMonth ?? undefined, fallbackMonth);

  const [summary, setSummary] = useState<CardInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestedMonth || requestedMonth.trim() !== normalizedMonth) {
      const paramsCopy = new URLSearchParams(location.search);
      if (normalizedMonth) {
        paramsCopy.set("month", normalizedMonth);
      } else {
        paramsCopy.delete("month");
      }
      navigate(
        {
          pathname: location.pathname,
          search: paramsCopy.toString() ? `?${paramsCopy.toString()}` : "",
        },
        { replace: true },
      );
    }
  }, [location.pathname, location.search, normalizedMonth, requestedMonth, navigate]);

  useEffect(() => {
    if (!derivedCardId) {
      setSummary(null);
      setError("Cartão não informado.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getCardInvoiceSummary(derivedCardId, normalizedMonth)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        if (!data.items.length) {
          console.info("Invoice summary empty", {
            cardId: derivedCardId,
            month: normalizedMonth,
            payload: data,
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Erro ao carregar o resumo da fatura.";
        setError(message);
        setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [derivedCardId, normalizedMonth]);

  const changeMonth = (target: string) => {
    const paramsCopy = new URLSearchParams(location.search);
    paramsCopy.set("month", target);
    navigate(
      {
        pathname: location.pathname,
        search: `?${paramsCopy.toString()}`,
      },
      { replace: true },
    );
  };

  const totalLabel = summary?.total !== undefined ? formatBRL(summary.total) : "—";
  const cardLabel = summary?.cardName ?? "Resumo de fatura";
  const monthLabel = formatMonthLabel(normalizedMonth);

  const renderInstallments = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm"
            >
              <div className="h-3 w-32 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full bg-slate-200" />
                  <div className="h-2 w-1/3 rounded-full bg-slate-200" />
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
    if (!summary || !summary.items.length) {
      return <p className="text-sm text-slate-500">Nenhuma parcela neste ciclo.</p>;
    }
    return (
      <div className="space-y-4">
        {summary.items.map((item) => {
          const installmentAmount =
            item.installmentAmount ??
            (item.totalAmount && item.installmentCount
              ? item.totalAmount / item.installmentCount
              : item.totalAmount) ??
            0;
          const badgeLabel = item.installmentCount ? `${item.installmentCount}x` : undefined;
          const progressLabel =
            item.installmentCurrent && item.installmentCount
              ? `${item.installmentCurrent}/${item.installmentCount}`
              : undefined;
          const dateLabel = item.date ? formatDate(item.date) : "Compra sem data";
          const totalLabelText = item.totalAmount ? ` • Total ${formatBRL(item.totalAmount)}` : "";
          return (
            <div
              key={item.id}
              className="space-y-2 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-500">
                    {`Compra em ${dateLabel}${totalLabelText}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatBRL(installmentAmount)}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    {badgeLabel && (
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 font-semibold">
                        {badgeLabel}
                      </span>
                    )}
                    {progressLabel && <span>{progressLabel}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!derivedCardId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <p className="text-sm text-rose-700">Cartão não informado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/cards");
            }
          }}
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
          onClick={() => changeMonth(shiftMonth(normalizedMonth, -1))}
          aria-label="Mês anterior"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mês</p>
          <p className="text-base font-semibold text-slate-900">{monthLabel}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300"
          onClick={() => changeMonth(shiftMonth(normalizedMonth, 1))}
          aria-label="Próximo mês"
        >
          →
        </button>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Valor do ciclo
            </p>
            <p className="text-2xl font-semibold text-slate-900">{totalLabel}</p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
            Resumo
          </span>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">Parcelas</h2>
          <p className="text-xs text-slate-500">Itens já parcelados para o ciclo selecionado</p>
        </div>
        {renderInstallments()}
      </section>
    </div>
  );
};

export default CardInvoicePage;
