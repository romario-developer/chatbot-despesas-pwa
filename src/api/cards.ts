import { apiRequest } from "./client";
import type { CreditCard } from "../types";

export type CardPayload = {
  name: string;
  brand?: string;
  limit: number;
  closingDay?: number;
  dueDay?: number;
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
} | null;

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

  return {
    id: String(id),
    name,
    brand,
    limit,
    closingDay,
    dueDay,
  };
};

export const listCards = async (): Promise<CreditCard[]> => {
  const data = await apiRequest<RawCard[] | null>({
    url: "/api/cards",
    method: "GET",
  });

  const list = Array.isArray(data) ? data : [];
  return list.map((item) => normalizeCard(item)).filter(Boolean) as CreditCard[];
};

export const createCard = async (payload: CardPayload): Promise<CreditCard | null> => {
  const data = await apiRequest<RawCard>({
    url: "/api/cards",
    method: "POST",
    data: payload,
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
    data: payload,
  });
  return normalizeCard(data);
};

export const deleteCard = async (id: string): Promise<void> => {
  await apiRequest<void>({
    url: `/api/cards/${id}`,
    method: "DELETE",
  });
};
