import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCard,
  deleteCard,
  listCards,
  updateCard,
  type CardPayload,
} from "../../api/cards";
import { formatBRL } from "../../utils/format";
import { cardBase, cardHover, subtleText } from "../../styles/dashboardTokens";
import ConfirmDialog from "../ConfirmDialog";
import type { CreditCard } from "../../types";

type CardFormState = {
  name: string;
  brand: string;
  limit: string;
  closingDay: string;
  dueDay: string;
};

const emptyForm: CardFormState = {
  name: "",
  brand: "",
  limit: "",
  closingDay: "",
  dueDay: "",
};

const normalizeDay = (value: string) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (num < 1 || num > 31) return undefined;
  return Math.trunc(num);
};

const CreditCardsSection = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formState, setFormState] = useState<CardFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listCards();
      setCards(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar cartoes.";
      setError(message);
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
    setFormOpen(true);
  };

  const openEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormState({
      name: card.name ?? "",
      brand: card.brand ?? "",
      limit: card.limit ? String(card.limit) : "",
      closingDay: card.closingDay ? String(card.closingDay) : "",
      dueDay: card.dueDay ? String(card.dueDay) : "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    const name = formState.name.trim();
    if (!name) {
      setFormError("Informe o nome do cartao.");
      return;
    }

    const limitText = formState.limit.trim();
    const limitValue = Number(limitText);
    if (!limitText || !Number.isFinite(limitValue)) {
      setFormError("Informe o limite do cartao.");
      return;
    }

    const payload: CardPayload = {
      name,
      brand: formState.brand.trim() || undefined,
      limit: limitValue,
      closingDay: normalizeDay(formState.closingDay),
      dueDay: normalizeDay(formState.dueDay),
    };

    setIsSaving(true);
    setFormError(null);
    try {
      const saved = editingCard
        ? await updateCard(editingCard.id, payload)
        : await createCard(payload);
      if (saved) {
        setCards((prev) => {
          if (editingCard) {
            return prev.map((item) => (item.id === saved.id ? saved : item));
          }
          return [saved, ...prev];
        });
      } else {
        await loadCards();
      }
      setFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar cartao.";
      setFormError(message);
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
          {cardsList.map((card) => (
            <div key={card.id} className={`${cardBase} ${cardHover} space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{card.name}</h4>
                  {card.brand && (
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                      {card.brand}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => openEdit(card)}
                    className="text-primary hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardToDelete(card)}
                    className="text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{formatBRL(card.limit)}</p>
                <p>
                  Fechamento: dia {card.closingDay ?? "-"}
                </p>
                <p>
                  Vencimento: dia {card.dueDay ?? "-"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${cardBase} ${subtleText}`}>Nenhum cartao cadastrado.</div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-slate-900">
              {editingCard ? "Editar cartao" : "Novo cartao"}
            </h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Nome
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Bandeira
                <input
                  type="text"
                  value={formState.brand}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, brand: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Limite
                <input
                  type="number"
                  inputMode="decimal"
                  value={formState.limit}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, limit: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Dia do fechamento
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={formState.closingDay}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, closingDay: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Dia do vencimento
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={formState.dueDay}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, dueDay: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cardToDelete)}
        title="Confirmar exclusao"
        description="Deseja excluir este cartao?"
        confirmLabel={isDeleting ? "Excluindo..." : "Excluir"}
        onConfirm={handleDelete}
        onCancel={() => !isDeleting && setCardToDelete(null)}
      />
    </div>
  );
};

export default CreditCardsSection;
