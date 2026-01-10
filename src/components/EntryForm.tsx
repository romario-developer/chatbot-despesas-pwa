import { useEffect, useMemo, useState } from "react";
import type { CreditCard, Entry, EntryPayload, PaymentMethod } from "../types";
import { listCardsCached } from "../services/cardsService";

type EntryFormProps = {
  initialValues?: Partial<Entry>;
  categories?: string[];
  onSubmit: (payload: EntryPayload) => Promise<void>;
  onCancel: () => void;
};

type FormErrors = Partial<Record<keyof EntryPayload, string>>;

const PAYMENT_METHODS: PaymentMethod[] = [
  "Dinheiro",
  "Debito",
  "Credito",
  "Pix",
  "Transferencia",
  "Outro",
];

const normalizeAmount = (value: string) => {
  const sanitized = value.replace(/\./g, "").replace(",", ".");
  return Number(sanitized);
};

const resolvePaymentMethod = (entry?: Partial<Entry>): PaymentMethod => {
  if (entry?.paymentMethod && PAYMENT_METHODS.includes(entry.paymentMethod)) {
    return entry.paymentMethod;
  }
  if (entry?.cardId) return "Credito";
  return "Dinheiro";
};

const formatCardLabel = (card: CreditCard) =>
  card.brand ? `${card.name} • ${card.brand}` : card.name;

const EntryForm = ({ initialValues, categories = [], onSubmit, onCancel }: EntryFormProps) => {
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [amount, setAmount] = useState(
    initialValues?.amount !== undefined ? String(initialValues.amount) : "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [date, setDate] = useState(
    initialValues?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [source] = useState(initialValues?.source ?? "manual");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    resolvePaymentMethod(initialValues),
  );
  const [cardId, setCardId] = useState(initialValues?.cardId ?? "");
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDescription(initialValues?.description ?? "");
    setAmount(
      initialValues?.amount !== undefined ? String(initialValues.amount) : "",
    );
    setCategory(initialValues?.category ?? "");
    setDate(initialValues?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    const nextPayment = resolvePaymentMethod(initialValues);
    const nextCardId = initialValues?.cardId ?? "";
    setPaymentMethod(nextPayment);
    setCardId(nextPayment === "Credito" ? nextCardId : "");
  }, [initialValues]);

  useEffect(() => {
    let isActive = true;
    const loadCards = async () => {
      setCardsLoading(true);
      setCardsError(null);
      try {
        const data = await listCardsCached();
        if (isActive) {
          setCards(data);
        }
      } catch (err) {
        if (isActive) {
          const message =
            err instanceof Error ? err.message : "Erro ao carregar cartoes.";
          setCardsError(message);
          setCards([]);
        }
      } finally {
        if (isActive) {
          setCardsLoading(false);
        }
      }
    };

    loadCards();

    return () => {
      isActive = false;
    };
  }, []);

  const safeCategories = Array.isArray(categories)
    ? categories
    : Object.keys((categories ?? {}) as Record<string, unknown>);

  const validate = (): EntryPayload | null => {
    const nextErrors: FormErrors = {};
    if (!description.trim()) nextErrors.description = "Descricao obrigatoria";
    if (!category.trim()) nextErrors.category = "Categoria obrigatoria";
    if (!date) nextErrors.date = "Data obrigatoria";
    if (!paymentMethod) nextErrors.paymentMethod = "Pagamento obrigatorio";

    const parsedAmount = normalizeAmount(amount);
    if (!amount.trim() || Number.isNaN(parsedAmount)) {
      nextErrors.amount = "Valor invalido";
    } else if (parsedAmount === 0) {
      nextErrors.amount = "Valor deve ser diferente de zero";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      description: description.trim(),
      amount: parsedAmount,
      category: category.trim(),
      date,
      source,
      paymentMethod,
      cardId: paymentMethod === "Credito" && cardId ? cardId : null,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    const payload = validate();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = useMemo(() => safeCategories, [safeCategories]);
  const isCredit = paymentMethod === "Credito";
  const selectedCard = useMemo(
    () => cards.find((card) => card.id === cardId),
    [cardId, cards],
  );

  return (
    <form className="card space-y-4 p-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Descricao
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Ex.: Almoco"
            required
          />
        </label>
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Valor
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="0,00"
            required
          />
        </label>
        {errors.amount && (
          <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Categoria
          <input
            list="entry-categories"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Ex.: Alimentacao"
            required
          />
          {categoryOptions.length > 0 && (
            <datalist id="entry-categories">
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          )}
        </label>
        {errors.category && (
          <p className="mt-1 text-xs text-red-600">{errors.category}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Pagamento
          <select
            value={paymentMethod}
            onChange={(e) => {
              const next = e.target.value as PaymentMethod;
              setPaymentMethod(next);
              if (next !== "Credito") {
                setCardId("");
              }
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        {errors.paymentMethod && (
          <p className="mt-1 text-xs text-red-600">{errors.paymentMethod}</p>
        )}
      </div>

      {isCredit && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cartao
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={cardsLoading}
            >
              <option value="">Selecionar cartao</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {formatCardLabel(card)}
                </option>
              ))}
            </select>
          </label>
          {cardsLoading && (
            <p className="mt-1 text-xs text-slate-500">Carregando cartoes...</p>
          )}
          {cardsError && (
            <p className="mt-1 text-xs text-red-600">{cardsError}</p>
          )}
          {!cardsLoading && !cardsError && cards.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Nenhum cartao cadastrado.
            </p>
          )}
          {selectedCard && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedCard.color ?? "#94a3b8" }}
              />
              <span>{formatCardLabel(selectedCard)}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Data
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </label>
        {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
      </div>

      {apiError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {apiError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
};

export default EntryForm;
