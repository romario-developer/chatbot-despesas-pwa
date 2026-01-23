const BAHIA_TIMEZONE = "America/Bahia";

const formatDateToBahia = (date: Date) =>
  date.toLocaleDateString("en-CA", { timeZone: BAHIA_TIMEZONE });

export const toYMD = (input: string | Date): string => {
  if (input instanceof Date) {
    return formatDateToBahia(input);
  }
  if (input.includes("T")) {
    return input.split("T")[0];
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(input)) {
    return input;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`toYMD: invalid date input "${input}"`);
  }
  return formatDateToBahia(parsed);
};
