import type { ChangeEventHandler } from "react";

type MonthPickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

const MonthPicker = ({ id, label, value, onChange }: MonthPickerProps) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange(event.target.value);
  };

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label && <span>{label}</span>}
      <input
        id={id}
        type="month"
        value={value}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
};

export default MonthPicker;
