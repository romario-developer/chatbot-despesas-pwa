import { apiRequest } from "./client";
import { api } from "../services/api";
import type { CreditCard } from "../types";

export type CardPayload = {
  name: string;
  brand?: string;
  limit: number;
  closingDay?: number;
  dueDay?: number;
  color?: string;
};

type RawCard = {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  brand?: unknown;
  limit?: unknown;
  creditLimit?: unknown;
  closingDay?: unknown;
  closingDate?: unknown;
  dueDay?: unknown;
  dueDate?: unknown;
  color?: unknown;
  textColor?: unknown;
} | null;

const normalizeBrand = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  const normalized = upper.replace(/\s+/g, "");
  const map: Record<string, string> = {
    VISA: "VISA",
    MASTERCARD: "MASTERCARD",
    "MASTER CARD": "MASTERCARD",
    MASTER: "MASTERCARD",
    ELO: "ELO",
    AMEX: "AMEX",
    "AMERICAN EXPRESS": "AMEX",
    AMERICANEXPRESS: "AMEX",
    OTHER: "OTHER",
  };
  return map[upper] ?? map[normalized] ?? normalized;
};

const normalizePayload = (payload: CardPayload): CardPayload => {
  const name = payload.name.trim();
  const limit = Number(payload.limit);
  const limitValue = Number.isFinite(limit) ? limit : 0;
  const closingDay = Number(payload.closingDay);
  const closingDayValue = Number.isFinite(closingDay) ? closingDay : undefined;
  const dueDay = Number(payload.dueDay);
  const dueDayValue = Number.isFinite(dueDay) ? dueDay : undefined;
  const color = payload.color?.trim();

  return {
    name,
    brand: normalizeBrand(payload.brand),
    limit: limitValue,
    closingDay: closingDayValue,
    dueDay: dueDayValue,
    color: color || undefined,
  };
};

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizeDay = (value: unknown) => {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return Number(match[3]);
    }
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizeCard = (value: RawCard): CreditCard | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const id = data.id ?? data._id;
  if (typeof id !== "string" && typeof id !== "number") return null;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) return null;
  const brand = typeof data.brand === "string" ? data.brand.trim() : undefined;
  const limitRaw = data.limit ?? data.creditLimit;
  const limitValue = normalizeNumber(limitRaw);
  const limit = typeof limitValue === "number" ? limitValue : 0;
  const closingDay = normalizeDay(data.closingDay ?? data.closingDate);
  const dueDay = normalizeDay(data.dueDay ?? data.dueDate);
  const color = typeof data.color === "string" ? data.color.trim() : undefined;
  const textColor =
    typeof data.textColor === "string" ? data.textColor.trim() : undefined;

  return {
    id: String(id),
    name,
    brand,
    limit,
    closingDay,
    dueDay,
    color: color || undefined,
    textColor: textColor || undefined,
  };
};

export type ListCardsResult = {
  cards: CreditCard[];
  status: number;
  rawLength: number;
};

export const listCards = async (): Promise<ListCardsResult> => {
  const response = await api.request<RawCard[] | null>({
    url: "/api/cards",
    method: "GET",
  });

  const list = Array.isArray(response.data) ? response.data : [];
  const cards = list.map((item) => normalizeCard(item)).filter(Boolean) as CreditCard[];
  return {
    cards,
    status: response.status,
    rawLength: list.length,
  };
};

export const createCard = async (payload: CardPayload): Promise<CreditCard | null> => {
  const data = await apiRequest<RawCard>({
    url: "/api/cards",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: normalizePayload(payload),
  });
  return normalizeCard(data);
};

export const updateCard = async (
  id: string,
  payload: CardPayload,
): Promise<CreditCard | null> => {
  const data = await apiRequest<RawCard>({
    url: `/api/cards/${id}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: normalizePayload(payload),
  });
  return normalizeCard(data);
};

export const deleteCard = async (id: string): Promise<void> => {
  await apiRequest<void>({
    url: `/api/cards/${id}`,
    method: "DELETE",
  });
};
