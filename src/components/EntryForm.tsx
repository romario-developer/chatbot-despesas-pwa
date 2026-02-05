import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  Category,
  CreditCard,
  Entry,
  EntryPayload,
  PaymentMethod,
} from "../types";
import { createCategory, listCategories } from "../api/categories";
import { listCardsCached } from "../services/cardsService";
import MoneyInput from "./MoneyInput";
import {
  formatPaymentMethodLabel,
  isPaymentMethodCredit,
  mapToPaymentMethod,
  PAYMENT_METHODS,
} from "../utils/paymentMethods";

type EntryFormProps = {
  initialValues?: Partial<Entry>;
  onSubmit: (payload: EntryPayload) => Promise<void>;
  onCancel: () => void;
};

type FormErrors = Partial<Record<keyof EntryPayload, string>>;

const resolveEntryPaymentMethod = (entry?: Partial<Entry>): PaymentMethod => {
  if (entry?.paymentMethod) {
    return mapToPaymentMethod(entry.paymentMethod) ?? "CASH";
  }
  if (entry?.cardId) return "CREDIT";
  return "CASH";
};

const formatCardLabel = (card: CreditCard) =>
  card.brand ? `${card.name} \u2022 ${card.brand}` : card.name;

const EntryForm = ({ initialValues, onSubmit, onCancel }: EntryFormProps) => {
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const toInitialCents = (value?: number) => {
    const safe = Number.isFinite(value ?? NaN) ? (value as number) : 0;
    return Math.round(safe * 100);
  };
  const [amountCents, setAmountCents] = useState(() =>
    toInitialCents(initialValues?.amount),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialValues?.categoryId ?? "",
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);
  const [date, setDate] = useState(
    initialValues?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [source] = useState(initialValues?.source ?? "manual");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    resolveEntryPaymentMethod(initialValues),
  );
  const [cardId, setCardId] = useState(initialValues?.cardId ?? "");
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isInstallmentEntry = Boolean(initialValues?.installmentGroupId);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const list = await listCategories({ active: true });
      setCategories(list);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar categorias.";
      setCategoriesError(message);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    setDescription(initialValues?.description ?? "");
    setAmountCents(toInitialCents(initialValues?.amount));
    setSelectedCategoryId(initialValues?.categoryId ?? "");
    setCategorySearch("");
    setDate(initialValues?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    const nextPayment = resolveEntryPaymentMethod(initialValues);
    const nextCardId = initialValues?.cardId ?? "";
    setPaymentMethod(nextPayment);
    setCardId(nextPayment === "CREDIT" ? nextCardId : "");
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

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCategoryId) return;
    const fallbackName = initialValues?.category?.trim();
    if (!fallbackName) return;
    const match = categories.find(
      (item) => item.name.toLowerCase() === fallbackName.toLowerCase(),
    );
    if (match) {
      setSelectedCategoryId(match.id);
    }
  }, [categories, initialValues?.category, selectedCategoryId]);

  const validate = (): EntryPayload | null => {
    const nextErrors: FormErrors = {};
    if (!description.trim()) nextErrors.description = "Descricao obrigatoria";
    if (!selectedCategoryId) nextErrors.category = "Categoria obrigatoria";
    if (!date) nextErrors.date = "Data obrigatoria";
    if (!paymentMethod) {
      nextErrors.paymentMethod = "Pagamento obrigatorio";
    }
    if (isPaymentMethodCredit(paymentMethod) && !cardId) {
      nextErrors.cardId = "Cartao obrigatorio para pagamentos no credito";
    }

    const parsedAmount = amountCents / 100;
    if (amountCents <= 0 || Number.isNaN(parsedAmount)) {
      nextErrors.amount = "Valor invalido";
    } else if (parsedAmount === 0) {
      nextErrors.amount = "Valor deve ser diferente de zero";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    const categoryById = categories.find((item) => item.id === selectedCategoryId);

    return {
      description: description.trim(),
      amount: parsedAmount,
      amountCents,
      category: categoryById?.name ?? initialValues?.category ?? "",
      categoryId: selectedCategoryId || null,
      date,
      source,
      paymentMethod,
      cardId: isPaymentMethodCredit(paymentMethod) && cardId ? cardId : null,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCreateCategoryError(null);
    setNewCategoryName("");
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCreateCategoryError("Informe o nome da categoria.");
      return;
    }

    setCreateCategoryError(null);
    setCreatingCategory(true);
    try {
      const created = await createCategory(name);
      if (created) {
        await loadCategories();
        setSelectedCategoryId(created.id);
        setCategorySearch("");
        closeCategoryModal();
      } else {
        setCreateCategoryError("Nao foi possivel criar categoria.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar categoria.";
      setCreateCategoryError(message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter((item) => item.name.toLowerCase().includes(term));
  }, [categories, categorySearch]);
  const hasCategories = categories.length > 0;
  const showNoCategoriesMessage = !categoriesLoading && !hasCategories;
  const isCredit = isPaymentMethodCredit(paymentMethod);
  const selectedCard = useMemo(
    () => cards.find((card) => card.id === cardId),
    [cardId, cards],
  );

  return (
    <>
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
          <MoneyInput
            valueCents={amountCents}
            onChangeCents={setAmountCents}
            className="mt-2 w-full"
            placeholder="0,00"
            disabled={isInstallmentEntry}
            required
          />
        </label>
        {errors.amount && (
          <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
        )}
        {isInstallmentEntry && (
          <p className="mt-1 text-xs text-slate-500">
            Valor faz parte de um parcelamento e nao pode ser alterado.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700">Categoria</label>
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-xs font-semibold text-primary underline-offset-2 transition hover:underline"
          >
            + Nova categoria
          </button>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            disabled={categoriesLoading}
            placeholder="Buscar categoria"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            disabled={categoriesLoading || !hasCategories}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Selecionar categoria</option>
            {categoryOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {categoriesLoading && (
            <p className="text-sm text-slate-500">Carregando categorias...</p>
          )}
          {showNoCategoriesMessage && (
            <p className="text-sm text-slate-500">Sem categorias ativas.</p>
          )}
          {categoriesError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <p>{categoriesError}</p>
              <button
                type="button"
                onClick={loadCategories}
                className="mt-2 inline-flex items-center rounded bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
        {errors.category && (
          <p className="text-xs text-red-600">{errors.category}</p>
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
              if (!isPaymentMethodCredit(next)) {
                setCardId("");
              }
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={isInstallmentEntry}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {formatPaymentMethodLabel(method)}
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
              disabled={cardsLoading || isInstallmentEntry}
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
          <p className="mt-2 text-xs text-slate-500">
            Credito entra na fatura do cartao e nao reduz saldo em conta agora.
          </p>
          {errors.cardId && (
            <p className="mt-1 text-xs text-red-600">{errors.cardId}</p>
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

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={closeCategoryModal} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Nova categoria</h3>
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100"
                aria-label="Fechar modal"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M4.72 4.72a.75.75 0 0 1 1.06 0L10 8.94l4.22-4.22a.75.75 0 1 1 1.06 1.06L11.06 10l4.22 4.22a.75.75 0 1 1-1.06 1.06L10 11.06l-4.22 4.22a.75.75 0 0 1-1.06-1.06L8.94 10 4.72 5.78a.75.75 0 0 1 0-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Nome
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Ex.: Alimentacao"
              />
            </label>
            {createCategoryError && (
              <p className="mt-2 text-xs text-red-600">{createCategoryError}</p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCategoryModal}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary sm:w-auto"
                disabled={creatingCategory}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={creatingCategory}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 sm:w-auto"
              >
                {creatingCategory ? "Criando..." : "Criar categoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EntryForm;
