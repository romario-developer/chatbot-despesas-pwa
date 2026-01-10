import { apiRequest } from "../api/client";
import type { PaymentMethod } from "../types";
import { mapToPaymentMethod } from "../utils/paymentMethods";

type QuickEntryApiResponse =
  | {
      description?: unknown;
      amount?: unknown;
      paymentMethod?: unknown;
      card?: unknown;
      entry?: unknown;
      data?: unknown;
      created?: unknown;
    }
  | null;

type QuickEntryCardInfo = {
  id?: string;
  name?: string;
  brand?: string;
  color?: string;
};

export type QuickEntryResult = {
  description?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  card?: QuickEntryCardInfo;
};

export type QuickEntryResponse = QuickEntryResult & {
  createdCount?: number;
};

const normalizeAmount = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
};

const normalizeDescription = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const normalizePaymentMethod = (value: unknown): PaymentMethod | undefined => {
  if (typeof value !== "string") return undefined;
  return mapToPaymentMethod(value);
};

const normalizeCardInfo = (value: unknown): QuickEntryCardInfo | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return { name: trimmed };
  }
  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    const id =
      typeof data.id === "string"
        ? data.id
        : typeof data.cardId === "string"
          ? data.cardId
          : undefined;
    const name =
      typeof data.name === "string" ? data.name.trim() : undefined;
    const brand =
      typeof data.brand === "string" ? data.brand.trim() : undefined;
    const color =
      typeof data.color === "string" ? data.color.trim() : undefined;
    if (!id && !name) return undefined;
    return {
      id,
      name,
      brand,
      color,
    };
  }
  return undefined;
};

const resolveCreatedEntries = (value: QuickEntryApiResponse): Record<string, unknown>[] => {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.created)) {
    return record.created.filter(Boolean).map((item) => (item as Record<string, unknown>));
  }
  return [];
};

const extractRecord = (value: QuickEntryApiResponse): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.entry && typeof record.entry === "object") {
    return record.entry as Record<string, unknown>;
  }
  if (record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>;
  }
  return record;
};

const normalizeQuickEntryResult = (data: QuickEntryApiResponse): QuickEntryResponse => {
  const createdEntries = resolveCreatedEntries(data);
  const payload =
    createdEntries.length > 0
      ? createdEntries[0]
      : extractRecord(data);
  if (!payload) return {};

  const description =
    normalizeDescription(payload.description ?? payload.descriptionText) ??
    normalizeDescription(payload.title);
  const amount =
    normalizeAmount(payload.amount ?? payload.value ?? payload.total);
  const paymentMethod =
    normalizePaymentMethod(
      payload.paymentMethod ?? payload.method ?? payload.payMethod,
    ) ?? normalizePaymentMethod(payload.payment ?? payload.payment_mode);
  const card =
    normalizeCardInfo(payload.card ?? payload.creditCard ?? payload.cardData) ??
    normalizeCardInfo(payload.cardId);

  return {
    description,
    amount,
    paymentMethod,
    card,
    createdCount: createdEntries.length || undefined,
  };
};

export const createQuickEntry = async (text: string): Promise<QuickEntryResponse> => {
  const data = await apiRequest<QuickEntryApiResponse>({
    url: "/api/quick-entry",
    method: "POST",
    data: { text },
  });

  return normalizeQuickEntryResult(data);
};
