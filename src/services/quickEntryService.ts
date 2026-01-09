import { apiRequest } from "../api/client";

type QuickEntryApiResponse =
  | {
      description?: unknown;
      amount?: unknown;
      entry?: unknown;
      data?: unknown;
    }
  | null;

export type QuickEntryResult = {
  description?: string;
  amount?: number;
};

const normalizeQuickEntry = (value: unknown): QuickEntryResult => {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;
  const description =
    typeof data.description === "string" ? data.description.trim() : undefined;
  const amountValue = data.amount;
  const amount =
    typeof amountValue === "number" && Number.isFinite(amountValue)
      ? amountValue
      : undefined;

  return {
    description: description || undefined,
    amount,
  };
};

const extractQuickEntryResult = (data: QuickEntryApiResponse): QuickEntryResult => {
  if (!data) return {};
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (record.entry) return normalizeQuickEntry(record.entry);
    if (record.data) return normalizeQuickEntry(record.data);
  }
  return normalizeQuickEntry(data);
};

export const createQuickEntry = async (text: string): Promise<QuickEntryResult> => {
  const data = await apiRequest<QuickEntryApiResponse>({
    url: "/api/quick-entry",
    method: "POST",
    data: { text },
  });

  return extractQuickEntryResult(data);
};
