export const monthToRange = (month: string) => {
  const [yearStr = "", rawMonth = ""] = month.split("-");
  const monthStr = rawMonth.padStart(2, "0").slice(0, 2);
  const year = Number(yearStr);
  const monthIndex = Number(monthStr);

  if (!Number.isInteger(year) || year <= 0 || monthIndex < 1 || monthIndex > 12) {
    throw new Error("Mes invalido. Use o formato YYYY-MM.");
  }

  const from = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const to = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  return { from, to };
};
