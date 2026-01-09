import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCard,
  deleteCard,
  listCards,
  updateCard,
  type CardPayload,
} from "../../api/cards";
import { formatBRL, parseCurrencyInput } from "../../utils/format";
import { getReadableTextColor } from "../../utils/colors";
import { cardBase, cardHover, subtleText } from "../../styles/dashboardTokens";
import Toast from "../Toast";
import ConfirmDialog from "../ConfirmDialog";
import DayPickerSheet from "../DayPickerSheet";
import type { CreditCard } from "../../types";

type CardFormState = {
  name: string;
  brand: string;
  limit: string;
  closingDay: string;
  dueDay: string;
  color: string;
};

type FlowStep = "closed" | "method" | "form";
type MethodOption = "manual" | null;
type DayField = "closingDay" | "dueDay" | null;

const CARD_COLORS = [
  "#6d28d9",
  "#7c3aed",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#10b981",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
];

const emptyForm: CardFormState = {
  name: "",
  brand: "",
  limit: "",
  closingDay: "",
  dueDay: "",
  color: CARD_COLORS[0],
};

const BRAND_OPTIONS = ["Visa", "MasterCard", "Elo", "Amex", "Other"];

const normalizeDay = (value: string) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (num < 1 || num > 31) return undefined;
  return Math.trunc(num);
};

const buildApiErrorMessage = (err: unknown) => {
  if (!(err instanceof Error)) return "Erro inesperado.";
  const apiError = err as Error & { status?: number; payload?: unknown };
  let detail = err.message || "Erro inesperado.";
  const payload = apiError.payload;
  if (typeof payload === "string") {
    detail = payload;
  } else if (payload && typeof payload === "object") {
    const maybe = payload as { message?: unknown; error?: unknown };
    if (typeof maybe.message === "string" && maybe.message.trim()) {
      detail = maybe.message;
    } else if (typeof maybe.error === "string" && maybe.error.trim()) {
      detail = maybe.error;
    }
  }
  if (apiError.status) {
    return `Status ${apiError.status}: ${detail}`;
  }
  return detail;
};

const CreditCardsSection = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const createdRecentlyRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>("closed");
  const [selectedMethod, setSelectedMethod] = useState<MethodOption>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formState, setFormState] = useState<CardFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dayPickerField, setDayPickerField] = useState<DayField>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCards();
      // eslint-disable-next-line no-console
      console.info("[cards] list status:", result.status, "length:", result.rawLength);
      setCards(result.cards);
      if (result.cards.length === 0 && createdRecentlyRef.current) {
        setToast({
          message:
            "Nenhum cartao encontrado. Verifique autenticacao/filtro no backend.",
          type: "error",
        });
      }
      createdRecentlyRef.current = false;
    } catch (err) {
      const message = buildApiErrorMessage(err);
      const status = (err as Error & { status?: number }).status;
      const payload = (err as Error & { payload?: unknown }).payload;
      if (status) {
        // eslint-disable-next-line no-console
        console.warn("[cards] erro ao carregar:", status, payload);
      }
      setError(message);
      setCards([]);
      setToast({ message, type: "error" });
      createdRecentlyRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const openCreate = () => {
    setEditingCard(null);
    setFormState(emptyForm);
    setFormError(null);
    setSelectedMethod(null);
    setDayPickerField(null);
    setFlowStep("method");
  };

  const openEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormState({
      name: card.name ?? "",
      brand: card.brand ?? "",
      limit: card.limit ? String(card.limit) : "",
      closingDay: card.closingDay ? String(card.closingDay) : "",
      dueDay: card.dueDay ? String(card.dueDay) : "",
      color: card.color ?? CARD_COLORS[0],
    });
    setFormError(null);
    setSelectedMethod("manual");
    setDayPickerField(null);
    setFlowStep("form");
  };

  const closeFlow = () => {
    if (isSaving) return;
    setFlowStep("closed");
    setSelectedMethod(null);
    setDayPickerField(null);
    setFormError(null);
  };

  const openDayPicker = (field: DayField) => {
    if (!field) return;
    setDayPickerField(field);
  };

  const closeDayPicker = () => {
    setDayPickerField(null);
  };

  const handleContinue = () => {
    if (selectedMethod !== "manual") return;
    setFlowStep("form");
  };

  const handleDaySelect = (value: string) => {
    if (!dayPickerField) return;
    setFormState((prev) => ({ ...prev, [dayPickerField]: value }));
    closeDayPicker();
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    const name = formState.name.trim();
    if (!name) {
      setFormError("Informe o nome do cartao.");
      return;
    }

    const limitText = formState.limit.trim();
    const limitValue = parseCurrencyInput(limitText);
    if (!limitText || Number.isNaN(limitValue) || limitValue < 0) {
      setFormError("Informe o limite do cartao.");
      return;
    }

    const brand = formState.brand.trim();
    if (!brand) {
      setFormError("Informe a bandeira do cartao.");
      return;
    }

    const closingDay = normalizeDay(formState.closingDay);
    if (!closingDay) {
      setFormError("Informe o dia de fechamento.");
      return;
    }

    const dueDay = normalizeDay(formState.dueDay);
    if (!dueDay) {
      setFormError("Informe o dia de vencimento.");
      return;
    }

    const payload: CardPayload = {
      name,
      brand,
      limit: limitValue,
      closingDay,
      dueDay,
      color: formState.color || undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingCard) {
        await updateCard(editingCard.id, payload);
      } else {
        await createCard(payload);
        createdRecentlyRef.current = true;
      }
      setFlowStep("closed");
      setSelectedMethod(null);
      setDayPickerField(null);
      setEditingCard(null);
      await loadCards();
      setToast({
        message: editingCard ? "Cartao atualizado" : "Cartao criado",
        type: "success",
      });
    } catch (err) {
      const message = buildApiErrorMessage(err);
      const status = (err as Error & { status?: number }).status;
      const payload = (err as Error & { payload?: unknown }).payload;
      if (status) {
        // eslint-disable-next-line no-console
        console.warn("[cards] erro ao salvar:", status, payload);
      }
      setFormError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cardToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCard(cardToDelete.id);
      setCards((prev) => prev.filter((item) => item.id !== cardToDelete.id));
      setCardToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover cartao.";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const cardsList = useMemo(() => cards, [cards]);
  const isFlowOpen = flowStep !== "closed";
  const isMethodStep = flowStep === "method";
  const isFormStep = flowStep === "form";
  const canContinue = selectedMethod === "manual";
  const dayPickerValue = dayPickerField ? formState[dayPickerField] : "";
  const limitValue = parseCurrencyInput(formState.limit);
  const closingDayValue = normalizeDay(formState.closingDay);
  const dueDayValue = normalizeDay(formState.dueDay);
  const isSaveDisabled =
    !formState.name.trim() ||
    !formState.brand.trim() ||
    !Number.isFinite(limitValue) ||
    limitValue < 0 ||
    !closingDayValue ||
    !dueDayValue ||
    isSaving;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Cartoes de credito</h3>
          <p className={subtleText}>Gerencie seus limites e datas.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          Adicionar cartao
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={`${cardBase} ${subtleText}`}>Carregando cartoes...</div>
      ) : cardsList.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cardsList.map((card) => {
            const cardBackground = card.color ?? "#ffffff";
            const cardTextColor =
              card.textColor ?? getReadableTextColor(cardBackground);
            const isLightText =
              cardTextColor.toLowerCase() === "#ffffff" ||
              cardTextColor.toLowerCase() === "#fff";
            const badgeClass = isLightText
              ? "border-white/40 bg-white/20"
              : "border-black/20 bg-black/10";

            return (
              <div
                key={card.id}
                className={`${cardBase} ${cardHover} space-y-3`}
                style={{ backgroundColor: cardBackground, color: cardTextColor }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-current">
                      {card.name}
                    </h4>
                    {card.brand && (
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase text-current ${badgeClass}`}
                      >
                        {card.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      className="text-current opacity-80 transition hover:opacity-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardToDelete(card)}
                      className="text-current opacity-70 transition hover:opacity-100"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="text-sm text-current opacity-90">
                  <p className="font-semibold text-current opacity-100">
                    {formatBRL(card.limit)}
                  </p>
                  <p>Fechamento: dia {card.closingDay ?? "-"}</p>
                  <p>Vencimento: dia {card.dueDay ?? "-"}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${cardBase} ${subtleText}`}>Nenhum cartao cadastrado.</div>
      )}

      {isFlowOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4"
          onClick={closeFlow}
        >
          <div
            className="flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isMethodStep ? "Adicionar cartao" : "Cartao de credito"}
          >
            <div
              className="flex-1 overflow-y-auto px-6 pb-6 pt-6"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-purple-300">
                    {isMethodStep ? "Adicionar cartao" : "Cartao de credito"}
                  </p>
                  <h4 className="text-lg font-semibold">
                    {isMethodStep
                      ? "De que forma voce quer adicionar esse cartao?"
                      : editingCard
                        ? "Editar cartao"
                        : "Cartao de credito"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={closeFlow}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                  disabled={isSaving}
                >
                  Fechar
                </button>
              </div>

              {isMethodStep && (
                <>
                  <p className="mt-3 text-sm text-slate-300">
                    Escolha como deseja cadastrar o cartao.
                  </p>
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-left text-sm font-semibold text-slate-500"
                    >
                      Automatica (Open Finance)
                      <span className="mt-1 block text-xs text-slate-600">Em breve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("manual")}
                      className={`w-full rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${
                        selectedMethod === "manual"
                          ? "border-purple-400 bg-purple-500/20 text-white"
                          : "border-slate-800 bg-slate-900 text-slate-200 hover:border-purple-400"
                      }`}
                    >
                      Manual
                      <span className="mt-1 block text-xs text-slate-400">
                        Preencha os dados do cartao manualmente
                      </span>
                    </button>
                  </div>
                </>
              )}

              {isFormStep && (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200 sm:col-span-2">
                      Descricao
                      <input
                        type="text"
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white shadow-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                        placeholder="Ex: Cartao principal"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                      Limite do cartao
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formState.limit}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, limit: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white shadow-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                        placeholder="0,00"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                      Bandeira
                      <select
                        value={formState.brand}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, brand: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white shadow-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      >
                        <option value="">Selecione</option>
                        {BRAND_OPTIONS.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200 sm:col-span-2">
                      Cor do cartao
                      <div className="flex flex-wrap gap-2">
                        {CARD_COLORS.map((color) => {
                          const isSelected = formState.color === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                setFormState((prev) => ({ ...prev, color }))
                              }
                              className={`h-9 w-9 rounded-full border-2 transition ${
                                isSelected
                                  ? "border-white ring-2 ring-purple-300"
                                  : "border-slate-800"
                              }`}
                              style={{ backgroundColor: color }}
                              aria-label={`Selecionar cor ${color}`}
                            />
                          );
                        })}
                      </div>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200 sm:col-span-2">
                      Conta
                      <input
                        type="text"
                        value="Principal"
                        disabled
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-500 shadow-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                      Dia de fechamento
                      <button
                        type="button"
                        onClick={() => openDayPicker("closingDay")}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:border-purple-400"
                      >
                        {formState.closingDay ? `Dia ${formState.closingDay}` : "Selecionar dia"}
                      </button>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                      Dia de vencimento
                      <button
                        type="button"
                        onClick={() => openDayPicker("dueDay")}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:border-purple-400"
                      >
                        {formState.dueDay ? `Dia ${formState.dueDay}` : "Selecionar dia"}
                      </button>
                    </label>
                  </div>

                  {formError && (
                    <div className="mt-4 rounded-2xl bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
                      {formError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-950 px-6 py-4">
              {isMethodStep && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeFlow}
                    className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-purple-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-50"
                    disabled={!canContinue}
                  >
                    Continuar
                  </button>
                </div>
              )}
              {isFormStep && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeFlow}
                    className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-purple-400"
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-50"
                    disabled={isSaveDisabled}
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DayPickerSheet
        open={Boolean(dayPickerField)}
        title={
          dayPickerField === "closingDay"
            ? "Dia de fechamento"
            : dayPickerField === "dueDay"
              ? "Dia de vencimento"
              : "Selecionar dia"
        }
        value={dayPickerValue}
        onSelect={handleDaySelect}
        onClose={closeDayPicker}
      />

      <ConfirmDialog
        open={Boolean(cardToDelete)}
        title="Confirmar exclusao"
        description="Deseja excluir este cartao?"
        confirmLabel={isDeleting ? "Excluindo..." : "Excluir"}
        onConfirm={handleDelete}
        onCancel={() => !isDeleting && setCardToDelete(null)}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default CreditCardsSection;
