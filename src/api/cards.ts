import { apiRequest, getStoredToken } from "./client";
import { api } from "../services/api";
import type { CardInvoice, CreditCard } from "../types";

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

type ListCardsResponse =
  | RawCard[]
  | {
      cards?: RawCard[];
      data?: RawCard[];
      items?: RawCard[];
    }
  | null;

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
  const token = getStoredToken();
  const response = await api.request<ListCardsResponse>({
    url: "/api/cards",
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  let list: RawCard[] | undefined;
  if (Array.isArray(response.data)) {
    list = response.data;
  } else if (response.data && typeof response.data === "object") {
    if (Array.isArray(response.data.cards)) {
      list = response.data.cards;
    } else if (Array.isArray(response.data.data)) {
      list = response.data.data;
    } else if (Array.isArray(response.data.items)) {
      list = response.data.items;
    }
  }

  if (!list) {
    const error = new Error("Resposta invalida do endpoint /api/cards.") as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = response.status;
    error.payload = response.data;
    throw error;
  }

  const cards = list.map((item) => normalizeCard(item)).filter(Boolean) as CreditCard[];
  return {
    cards,
    status: response.status,
    rawLength: list.length,
  };
};

type RawInvoice = {
  id?: unknown;
  cardId?: unknown;
  card?: unknown;
  cardName?: unknown;
  name?: unknown;
  brand?: unknown;
  color?: unknown;
  textColor?: unknown;
  invoiceTotal?: unknown;
  total?: unknown;
  closingDay?: unknown;
  dueDay?: unknown;
  cycleStart?: unknown;
  cycleEnd?: unknown;
} | null;

type ListCardInvoicesResponse =
  | RawInvoice[]
  | {
      invoices?: RawInvoice[];
      data?: RawInvoice[];
      items?: RawInvoice[];
    }
  | null;

const resolveInvoiceList = (payload: ListCardInvoicesResponse): RawInvoice[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.invoices)) {
      return payload.invoices;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
  }
  return [];
};

const normalizeInvoice = (value: RawInvoice): CardInvoice | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const id =
    typeof data.cardId === "string"
      ? data.cardId
      : typeof data.id === "string"
        ? data.id
        : typeof data.card === "string"
          ? data.card
          : undefined;
  if (!id) return null;
  const cardName =
    typeof data.cardName === "string"
      ? data.cardName.trim()
      : typeof data.name === "string"
        ? data.name.trim()
        : typeof data.card === "string"
          ? data.card.trim()
          : undefined;
  if (!cardName) return null;
  const brand = typeof data.brand === "string" ? data.brand.trim() : undefined;
  const color = typeof data.color === "string" ? data.color.trim() : undefined;
  const textColor = typeof data.textColor === "string" ? data.textColor.trim() : undefined;
  const invoiceTotal = normalizeNumber(data.invoiceTotal ?? data.total ?? data.amount ?? 0) ?? 0;
  const closingDay = normalizeDay(data.closingDay);
  const dueDay = normalizeDay(data.dueDay);
  const cycleStart = typeof data.cycleStart === "string" ? data.cycleStart : undefined;
  const cycleEnd = typeof data.cycleEnd === "string" ? data.cycleEnd : undefined;

  return {
    cardId: String(id),
    cardName,
    brand,
    color: color || undefined,
    textColor: textColor || undefined,
    invoiceTotal,
    closingDay,
    dueDay,
    cycleStart,
    cycleEnd,
  };
};

export const listCardInvoices = async (): Promise<CardInvoice[]> => {
  const response = await api.request<ListCardInvoicesResponse>({
    url: "/api/cards/invoices",
    method: "GET",
  });

  // eslint-disable-next-line no-console
  console.log("invoices response:", response.data);

  const list = resolveInvoiceList(response.data);
  const invoices = list.map((item) => normalizeInvoice(item)).filter(Boolean) as CardInvoice[];
  return invoices;
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

export type CardPaymentPayload = {
  cardId: string;
  amount: number;
  paymentDate: string;
};

export const payCardInvoice = (payload: CardPaymentPayload) => {
  return apiRequest({
    url: "/api/cards/payments",
    method: "POST",
    data: payload,
  });
};
