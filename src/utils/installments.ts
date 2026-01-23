import type { Entry } from "../types";

export const formatEntryInstallmentLabel = (entry: Entry): string | null => {
  const current = entry.installmentCurrent ?? entry.installmentNumber;
  const total = entry.installmentTotal;
  if (typeof total === "number" && total > 1 && typeof current === "number") {
    return `${current}/${total}`;
  }
  return null;
};
