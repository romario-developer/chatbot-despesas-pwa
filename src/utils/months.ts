type MonthParts = {
  year: number;
  month: number;
};

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const parseMonthValue = (value: string): MonthParts | null => {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
};

const formatMonthValue = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const monthIndex = ({ year, month }: MonthParts) => year * 12 + (month - 1);

export const isMonthInRange = (value: string, start: string, end: string) => {
  const parsedValue = parseMonthValue(value);
  const parsedStart = parseMonthValue(start);
  const parsedEnd = parseMonthValue(end);
  if (!parsedValue || !parsedStart || !parsedEnd) return false;
  const valueIndex = monthIndex(parsedValue);
  return valueIndex >= monthIndex(parsedStart) && valueIndex <= monthIndex(parsedEnd);
};

export const shiftMonth = (value: string, delta: number) => {
  const parts = parseMonthValue(value);
  if (!parts) return value;
  const next = new Date(parts.year, parts.month - 1 + delta, 1);
  return formatMonthValue(next.getFullYear(), next.getMonth() + 1);
};

export const buildMonthList = ({ start, end }: { start: string; end: string }) => {
  const parsedStart = parseMonthValue(start);
  const parsedEnd = parseMonthValue(end);
  if (!parsedStart || !parsedEnd) return [];
  const startIndex = monthIndex(parsedStart);
  const endIndex = monthIndex(parsedEnd);
  if (startIndex > endIndex) return [];

  const list: string[] = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    list.push(formatMonthValue(year, month));
  }
  return list;
};

export const formatMonthLabel = (value: string) => {
  const parts = parseMonthValue(value);
  if (!parts) return value;
  const label = MONTH_LABELS[parts.month - 1] ?? value;
  return `${label} ${parts.year}`.trim();
};

export const formatMonthName = (value: string) => {
  const parts = parseMonthValue(value);
  if (!parts) return value;
  return MONTH_LABELS[parts.month - 1] ?? value;
};

export const getCurrentMonthInTimeZone = (timeZone = "America/Bahia") => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) return now.toISOString().slice(0, 7);
  return `${year}-${month}`;
};

export const getDefaultMonthRange = ({
  endMonth,
  monthsBack = 24,
  monthsAhead = 0,
  timeZone = "America/Bahia",
}: {
  endMonth?: string;
  monthsBack?: number;
  monthsAhead?: number;
  timeZone?: string;
} = {}) => {
  const baseEnd = endMonth ?? getCurrentMonthInTimeZone(timeZone);
  const end = monthsAhead ? shiftMonth(baseEnd, monthsAhead) : baseEnd;
  const start = shiftMonth(baseEnd, -monthsBack);
  return { start, end };
};
