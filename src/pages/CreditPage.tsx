import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBRL } from "../utils/format";
import {
  formatMonthLabel,
  formatMonthName,
  getCurrentMonthInTimeZone,
} from "../utils/months";
import {
  getCreditForecast,
  getCreditInvoice,
  getCreditOverview,
} from "../api/credit";
import type {
  CreditForecastItem,
  CreditInvoiceItem,
  CreditOverviewCard,
} from "../api/credit";

const formatAmount = (value?: number) =>
  typeof value === "number" ? formatBRL(value) : "—";

const CreditCardOverview = ({
  card,
  selected,
  onSelect,
}: {
  card: CreditOverviewCard;
  selected: boolean;
  onSelect: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-3xl border p-4 text-left transition ${
        selected
          ? "border-primary bg-primary/5 shadow-xl"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{card.name}</p>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {card.brand ?? "Cartão"}
        </span>
      </div>
      <p className="text-xs text-slate-500">Fatura atual</p>
      <p className="text-2xl font-semibold text-slate-900">
        {formatAmount(card.invoiceAmount)}
      </p>
      <p className="text-xs text-slate-500">
        Fechamento: {card.closingDate ?? "—"} · Vencimento: {card.dueDate ?? "—"}
      </p>
      {(card.limit !== undefined || card.availableLimit !== undefined) && (
        <p className="text-xs text-slate-600">
          Limite: {formatAmount(card.limit)}
          {card.availableLimit !== undefined
            ? ` · Disponível: ${formatAmount(card.availableLimit)}`
            : ""}
        </p>
      )}
    </button>
  );
};

const CreditPage = () => {
  const currentMonth = useMemo(
    () => getCurrentMonthInTimeZone("America/Bahia"),
    [],
  );
  const [month, setMonth] = useState(currentMonth);
  const [overview, setOverview] = useState<CreditOverviewCard[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<CreditInvoiceItem[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<CreditForecastItem[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [parcelFilter, setParcelFilter] = useState(false);

  const selectedCard = useMemo(
    () => overview.find((card) => card.cardId === selectedCardId) ?? null,
    [overview, selectedCardId],
  );

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const cards = await getCreditOverview(month);
      setOverview(cards);
      setSelectedCardId(cards[0]?.cardId ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar cartões.";
      setOverview([]);
      setSelectedCardId(null);
      setOverviewError(message);
    } finally {
      setOverviewLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!selectedCardId) {
      setInvoiceItems([]);
      setForecast([]);
      return;
    }

    let isCancelled = false;

    const loadInvoice = async () => {
      setInvoiceLoading(true);
      setInvoiceError(null);
      try {
        const items = await getCreditInvoice(selectedCardId, month);
        if (!isCancelled) {
          setInvoiceItems(items);
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "Erro ao carregar fatura.";
          setInvoiceItems([]);
          setInvoiceError(message);
        }
      } finally {
        if (!isCancelled) {
          setInvoiceLoading(false);
        }
      }
    };

    const loadForecast = async () => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        const items = await getCreditForecast(selectedCardId, 6);
        if (!isCancelled) {
          setForecast(items);
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "Erro ao carregar previsão.";
          setForecast([]);
          setForecastError(message);
        }
      } finally {
        if (!isCancelled) {
          setForecastLoading(false);
        }
      }
    };

    loadInvoice();
    loadForecast();

    return () => {
      isCancelled = true;
    };
  }, [month, selectedCardId]);

  const handleMonthChange = (value: string) => {
    setMonth(value);
  };

  const filteredInvoiceItems = useMemo(() => {
    if (!parcelFilter) return invoiceItems;
    return invoiceItems.filter(
      (item) => (item.installmentTotal ?? 0) > 1,
    );
  }, [invoiceItems, parcelFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Crédito e faturas</h1>
          <p className="text-sm text-slate-500">
            Mês selecionado: {formatMonthLabel(month)}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase text-slate-500">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Cartões disponíveis</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {overview.length} cartões
          </p>
        </div>
        {overviewLoading ? (
          <p className="text-sm text-slate-500">Carregando cartões...</p>
        ) : overviewError ? (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {overviewError}
          </div>
        ) : overview.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {overview.map((card) => (
              <CreditCardOverview
                key={card.cardId}
                card={card}
                selected={card.cardId === selectedCardId}
                onSelect={() => setSelectedCardId(card.cardId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhum cartão encontrado.</p>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Detalhe da fatura</h2>
          <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <input
              type="checkbox"
              checked={parcelFilter}
              onChange={(event) => setParcelFilter(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-0"
            />
            Somente parcelados
          </label>
        </div>
        {!selectedCard ? (
          <p className="text-sm text-slate-500">Selecione um cartão para ver os detalhes.</p>
        ) : invoiceLoading ? (
          <p className="text-sm text-slate-500">Carregando fatura...</p>
        ) : invoiceError ? (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {invoiceError}
          </div>
        ) : filteredInvoiceItems.length ? (
          <ul className="space-y-3">
            {filteredInvoiceItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                  {item.installmentTotal && item.installmentTotal > 1 && (
                    <p className="text-xs text-slate-500">
                      Parcelado {item.installmentCurrent ?? "?"}/
                      {item.installmentTotal}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatBRL(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhum item para mostrar.</p>
        )}

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <h3 className="text-base font-semibold text-slate-900">Próximas faturas</h3>
          {forecastLoading ? (
            <p className="text-sm text-slate-500">Carregando previsão...</p>
          ) : forecastError ? (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {forecastError}
            </div>
          ) : forecast.length ? (
            <ul className="space-y-2">
              {forecast.map((item) => (
                <li
                  key={item.month}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{formatMonthName(item.month)}</span>
                  <span className="font-semibold text-slate-900">
                    {formatBRL(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sem previsões disponíveis.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default CreditPage;
