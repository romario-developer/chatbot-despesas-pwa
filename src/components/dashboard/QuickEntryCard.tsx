import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { createQuickEntry, type QuickEntryResult } from "../../services/quickEntryService";
import { formatBRL } from "../../utils/format";
import { cardBase, cardHover, subtleText } from "../../styles/dashboardTokens";
import { notifyEntriesChanged } from "../../utils/entriesEvents";

type QuickEntryCardProps = {
  onCreated?: () => void | Promise<void>;
};

const buildSuccessMessage = (result: QuickEntryResult) => {
  const description = result.description;
  const amount = result.amount;

  if (typeof amount === "number" && Number.isFinite(amount)) {
    if (description) {
      return `Despesa registrada: ${description} - ${formatBRL(amount)}`;
    }
    return `Despesa registrada: ${formatBRL(amount)}`;
  }

  return "Despesa registrada com sucesso.";
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
