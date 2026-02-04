import type { ChangeEvent, InputHTMLAttributes } from "react";
import { formatCentsToBRL, parseBRLToCents } from "../utils/money";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  valueCents: number;
  onChangeCents: (cents: number) => void;
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
    const cents = parseBRLToCents(event.target.value);
    onChangeCents(Math.max(cents, 0));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={displayValue}
      placeholder={placeholder}
      disabled={disabled}
    className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
      onChange={handleChange}
      {...rest}
    />
  );
};

export default MoneyInput;
