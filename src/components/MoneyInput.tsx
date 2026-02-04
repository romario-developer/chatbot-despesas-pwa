import type { ChangeEvent, FocusEvent, InputHTMLAttributes, MouseEvent } from "react";
import { formatCentsToBRL } from "../utils/money";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  valueCents: number;
  onChangeCents: (next: number) => void;
};

const moveCaretToEnd = (input: HTMLInputElement | null) => {
  if (!input) return;
  const length = input.value.length;
  input.setSelectionRange(length, length);
};

const MoneyInput = ({
  valueCents,
  onChangeCents,
  className = "",
  disabled,
  placeholder,
  ...rest
}: MoneyInputProps) => {
  const displayValue = formatCentsToBRL(valueCents);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/\D/g, "");
    const nextCents = digitsOnly ? Number.parseInt(digitsOnly, 10) : 0;
    onChangeCents(Math.max(nextCents, 0));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    moveCaretToEnd(event.target);
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    moveCaretToEnd(event.currentTarget);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      placeholder={placeholder}
      disabled={disabled}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      {...rest}
    />
  );
};

export default MoneyInput;
