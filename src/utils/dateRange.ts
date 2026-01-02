export const monthToRange = (month: string) => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr);

  if (!year || !monthIndex) {
    throw new Error("Mes invalido. Use o formato YYYY-MM.");
  }

  const from = `${yearStr}-${monthStr.padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const to = `${yearStr}-${monthStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { from, to };
};
