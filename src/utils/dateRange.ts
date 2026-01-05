export const monthToRange = (month: string) => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNumber = Number(monthStr);

  if (!year || !monthNumber) {
    throw new Error("Mes invalido. Use o formato YYYY-MM.");
  }

  const paddedMonth = monthStr.padStart(2, "0");
  const from = `${yearStr}-${paddedMonth}-01`;

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === monthNumber;

  const lastDayOfMonth = new Date(year, monthNumber, 0).getDate();
  const toDay = isCurrentMonth
    ? Math.min(today.getDate(), lastDayOfMonth)
    : lastDayOfMonth;
  const to = `${yearStr}-${paddedMonth}-${String(toDay).padStart(2, "0")}`;

  return { from, to };
};
