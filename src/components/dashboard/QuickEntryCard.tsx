import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { createQuickEntry, type QuickEntryResponse } from "../../services/quickEntryService";
import { formatBRL } from "../../utils/format";
import { cardBase, cardHover, subtleText } from "../../styles/dashboardTokens";
import { notifyEntriesChanged } from "../../utils/entriesEvents";
import { formatPaymentMethodLabel } from "../../utils/paymentMethods";

type QuickEntryCardProps = {
  onCreated?: () => void | Promise<void>;
};

const buildSuccessMessage = (result: QuickEntryResponse) => {
  const description = result.description;
  const amount = result.amount;
  const installments = result.createdCount;

  if (installments && installments > 1) {
    return `Despesa registrada em ${installments} parcelas.`;
  }

  if (typeof amount === "number" && Number.isFinite(amount)) {
    if (description) {
      return `Despesa registrada: ${description} - ${formatBRL(amount)}`;
    }
    return `Despesa registrada: ${formatBRL(amount)}`;
  }

  return "Despesa registrada com sucesso.";
};

const formatQuickEntryBadge = (() => {
  const baseClass =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold";
  return {
    method: `${baseClass} border-slate-200 bg-slate-50 text-slate-700`,
    card: `${baseClass} border-slate-200 bg-white text-slate-600`,
  };
})();

const formatQuickEntryCardLabel = (card: QuickEntryResponse["card"]) => {
  if (!card) return null;
  const parts = [
    card.name?.trim(),
    card.brand?.trim(),
  ].filter(Boolean);
  if (!parts.length && card.id) {
    parts.push(card.id);
  }
  if (!parts.length) return null;
  return parts.join(" • ");
};

const resolveErrorMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : "";
  const normalized = message.toLowerCase();
  if (
    normalized.includes("network") ||
    normalized.includes("conex") ||
    normalized.includes("offline")
  ) {
    return "Falha de conexão. Tente novamente.";
  }
  if (normalized.includes("422") || normalized.includes("informe") || normalized.includes("valor")) {
    return "Informe um valor. Ex: mercado 50";
  }
  return message || "Falha ao registrar lançamento.";
};

const QuickEntryCard = ({ onCreated }: QuickEntryCardProps) => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<QuickEntryResponse | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const trimmed = text.trim();

    if (!trimmed) {
      setErrorMessage("Informe um valor. Ex: mercado 50");
      setSuccessMessage(null);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await createQuickEntry(trimmed);
      setSuccessMessage(buildSuccessMessage(result));
      setLastResult(result);
      setText("");
      if (onCreated) {
        await onCreated();
      } else {
        notifyEntriesChanged();
      }
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } catch (err) {
      setLastResult(null);
      setErrorMessage(resolveErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (value: string) => {
    setText(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
    if (lastResult) {
      setLastResult(null);
    }
  };

  const renderQuickEntryBadges = (result: QuickEntryResponse | null) => {
    if (!result) return null;
    const methodLabel = formatPaymentMethodLabel(result.paymentMethod);
    const cardLabel = formatQuickEntryCardLabel(result.card);
    if (!methodLabel && !cardLabel) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {methodLabel && (
          <span className={formatQuickEntryBadge.method}>{methodLabel}</span>
        )}
        {cardLabel && (
          <span className={formatQuickEntryBadge.card}>{cardLabel}</span>
        )}
      </div>
    );
  };

  return (
    <div className={`${cardBase} ${cardHover}`}>
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Entrada rápida</h3>
          <p className={subtleText}>
            Digite: mercado 50 | uber 23,90 | pix joao 100
          </p>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={handleSubmit}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Digite uma entrada"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Enviando..." : "Enviar"}
          </button>
        </form>
        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
            {renderQuickEntryBadges(lastResult)}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickEntryCard;
