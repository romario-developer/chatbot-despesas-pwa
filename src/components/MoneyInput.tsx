import type {
  ChangeEvent,
  FocusEvent,
  InputHTMLAttributes,
  MouseEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCentsToBRL } from "../utils/money";

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  valueCents: number;
  onChangeCents: (next: number) => void;
};

const moveCaretToEnd = (input: HTMLInputElement | null) => {
  if (!input) return;
  const length = input.value.length;
  input.setSelectionRange(length, length);
};

// "R$ 1.600,00" -> "1600,00" (editável)
const centsToEditableBR = (cents: number) => {
  const value = (cents / 100).toFixed(2); // "1600.00"
  return value.replace(".", ","); // "1600,00"
};

// Converte texto digitado -> centavos
const rawToCents = (raw: string) => {
  const trimmed = raw.trim();

  // Se tem separador decimal, tratar como decimal (pt-BR ou en-US)
  const hasDecimalSep = trimmed.includes(",") || trimmed.includes(".");

  if (!hasDecimalSep) {
    // Modo inteiro: "1600" => 1600 reais => 160000 cents
    const digitsOnly = trimmed.replace(/\D/g, "");
    const reaisInt = digitsOnly ? Number.parseInt(digitsOnly, 10) : 0;
    return Math.max(reaisInt * 100, 0);
  }

  // Modo decimal:
  // Regras:
  // - remover "R$" e espaços e símbolos
  // - se tem vírgula, ela é decimal e ponto é milhar
  // - se não tem vírgula e tem ponto, ponto é decimal
  let s = trimmed.replace(/[^\d.,-]/g, "");

  const hasComma = s.includes(",");
  if (hasComma) {
    s = s.replace(/\./g, ""); // remove milhares
    s = s.replace(",", "."); // vírgula -> ponto decimal
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return 0;

  return Math.max(Math.round(n * 100), 0);
};

const MoneyInput = ({
  valueCents,
  onChangeCents,
  className = "",
  disabled,
  placeholder,
  onFocus,
  onBlur,
  onMouseUp,
  ...rest
}: MoneyInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const displayValue = useMemo(() => formatCentsToBRL(valueCents), [valueCents]);

  // raw é o texto editável (sem "R$" e sem milhares)
  const [raw, setRaw] = useState<string>(displayValue);
  const [isEditing, setIsEditing] = useState(false);

  // Sincroniza o raw quando valueCents mudar externamente (ex.: editar item)
  useEffect(() => {
    if (isEditing) return;
    setRaw(displayValue);
  }, [displayValue, isEditing]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextRaw = event.target.value;
    setRaw(nextRaw);

    const nextCents = rawToCents(nextRaw);
    onChangeCents(nextCents);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    // troca para formato editável "1600,00"
    const editable = centsToEditableBR(valueCents);
    setRaw(editable);

    // garantir caret no fim após atualizar raw
    requestAnimationFrame(() => moveCaretToEnd(inputRef.current));

    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setIsEditing(false);
    // volta a exibição bonita
    setRaw(formatCentsToBRL(valueCents));
    onBlur?.(event);
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    // Evita “travada” do cursor: sempre move pro fim no clique
    moveCaretToEnd(event.currentTarget);
    onMouseUp?.(event);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={raw}
      placeholder={placeholder}
      disabled={disabled}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseUp={handleMouseUp}
      {...rest}
    />
  );
};

export default MoneyInput;
