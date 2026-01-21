import { apiRequest, getStoredToken } from "./client";
import { api, shouldLogApi } from "../services/api";
import { listEntries } from "./entries";
import type { CardInvoice, CreditCard, Entry } from "../types";

const CARD_DEBUG_KEY = "DEBUG_CARDS";
const isCardDebugEnabled = () =>
  typeof window !== "undefined" && window.localStorage.getItem(CARD_DEBUG_KEY) === "1";
const logCardDebug = (...args: unknown[]) => {
  if (!isCardDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[card-debug]", ...args);
};

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

const resolveCardList = (payload: ListCardsResponse): RawCard[] | null => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.cards)) {
      return payload.cards;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
  }
  return null;
};

const mapCardList = (list: RawCard[]): CreditCard[] =>
  list.map((item) => normalizeCard(item)).filter(Boolean) as CreditCard[];

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

  logCardDebug("raw payload", response.data);

  const list = resolveCardList(response.data);
  if (!list) {
    const error = new Error("Resposta invalida do endpoint /api/cards.") as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = response.status;
    error.payload = response.data;
    throw error;
  }

  const cards = mapCardList(list);
  if (cards.length) {
    cards.forEach((card) => logCardDebug("card", card));
  }
  return {
    cards,
    status: response.status,
    rawLength: list.length,
  };
};

export const getCardsSummary = async (): Promise<CreditCard[]> => {
  const token = getStoredToken();
  const response = await api.request<ListCardsResponse>({
    url: "/api/cards/summary",
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const list = resolveCardList(response.data);
  if (!list) {
    if (shouldLogApi) {
      // eslint-disable-next-line no-console
      console.warn(
        "[cards] /api/cards/summary returned unexpected payload",
        response.status,
        response.data,
      );
    }
    return [];
  }
  return mapCardList(list);
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
  entriesCount?: unknown;
  entries_count?: unknown;
  linesCount?: unknown;
  lines_count?: unknown;
  itemsCount?: unknown;
  paidTotal?: unknown;
  paid_total?: unknown;
  paidAmount?: unknown;
  amountPaid?: unknown;
  paid?: unknown;
  remaining?: unknown;
  remainingBalance?: unknown;
  balance?: unknown;
  balanceDue?: unknown;
  toPay?: unknown;
  to_pay?: unknown;
  status?: unknown;
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

export type GetCardInvoicesParams = {
  asOf?: string;
  month?: string;
};

const buildInvoicesPath = (params?: GetCardInvoicesParams) => {
  const search = new URLSearchParams();
  if (params?.asOf) search.append("asOf", params.asOf);
  if (params?.month) search.append("month", params.month);
  const query = search.toString();
  return query ? `/api/cards/invoices?${query}` : "/api/cards/invoices";
};

export const getCardInvoices = async (
  params?: GetCardInvoicesParams,
): Promise<CardInvoice[]> => {
  const response = await api.request<ListCardInvoicesResponse>({
    url: buildInvoicesPath(params),
    method: "GET",
  });
  const list = resolveInvoiceList(response.data);
  return list.map((item) => normalizeInvoice(item)).filter(Boolean) as CardInvoice[];
};

const normalizeInvoice = (value: RawInvoice): CardInvoice | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const invoiceCardRaw =
    data.card && typeof data.card === "object" ? (data.card as RawCard) : null;
  const invoiceCard = invoiceCardRaw ? normalizeCard(invoiceCardRaw) : null;
  const derivedCardId =
    invoiceCard?.id ??
    (typeof data.cardId === "string"
      ? data.cardId
      : typeof data.id === "string"
        ? data.id
        : typeof data.card === "string"
          ? data.card
          : undefined);
  if (!derivedCardId) return null;
  const cardName =
    invoiceCard?.name ??
    (typeof data.cardName === "string"
      ? data.cardName.trim()
      : typeof data.name === "string"
        ? data.name.trim()
        : typeof data.card === "string"
          ? data.card.trim()
          : undefined);
  if (!cardName) return null;
  const brand = typeof data.brand === "string" ? data.brand.trim() : undefined;
  const color = typeof data.color === "string" ? data.color.trim() : undefined;
  const textColor = typeof data.textColor === "string" ? data.textColor.trim() : undefined;
  const invoiceTotal = normalizeNumber(data.invoiceTotal ?? data.total ?? data.amount ?? 0) ?? 0;
  const nextInvoiceTotal =
    normalizeNumber(
      data.nextInvoiceTotal ?? data.next_total ?? data.nextInvoice ?? data.nextAmount ?? data.nextAmountValue,
    ) ?? undefined;
  const closingDay = normalizeDay(data.closingDay);
  const dueDay = normalizeDay(data.dueDay);
  const cycleStart = typeof data.cycleStart === "string" ? data.cycleStart : undefined;
  const cycleEnd = typeof data.cycleEnd === "string" ? data.cycleEnd : undefined;
  const entriesCount =
    normalizeNumber(
      data.entriesCount ??
        data.entries_count ??
        data.linesCount ??
        data.lines_count ??
        data.itemsCount ??
        data.transactionsCount ??
        data.entries ??
        data.items,
    ) ?? undefined;
  const paidTotal =
    normalizeNumber(
      data.paidTotal ??
        data.paid_total ??
        data.paidAmount ??
        data.amountPaid ??
        data.paid ??
        data.paid_value ??
        data.paidValue,
    ) ?? undefined;
  const remaining =
    normalizeNumber(
      data.remaining ??
        data.remainingBalance ??
        data.balance ??
        data.balanceDue ??
        data.toPay ??
        data.to_pay ??
        data.balance_remaining,
    ) ?? undefined;
  const status = typeof data.status === "string" ? data.status : undefined;

  const invoiceCardRaw =
    data.card && typeof data.card === "object" ? (data.card as RawCard) : null;
  const invoiceCard = invoiceCardRaw ? normalizeCard(invoiceCardRaw) : null;

  const invoiceName = cardName;
  return {
    cardId: String(derivedCardId),
    cardName,
    name: invoiceName,
    brand,
    color: color || undefined,
    textColor: textColor || undefined,
    invoiceTotal,
    nextInvoiceTotal,
    closingDay,
    dueDay,
    cycleStart,
    cycleEnd,
    entriesCount,
    paidTotal,
    remaining,
    status,
    card: invoiceCard ?? undefined,
  };
};

export const listCardInvoices = async (): Promise<CardInvoice[]> => {
  return getCardInvoices();
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

export type GetCardExpensesParams = {
  cardId: string;
  from?: string;
  to?: string;
};

export const getCreditExpensesByCardAndRange = async ({
  cardId,
  from,
  to,
}: GetCardExpensesParams): Promise<Entry[]> => {
  const entries = await listEntries({
    cardId,
    from,
    to,
    paymentMethod: "CREDIT",
  });

  return entries.filter(
    (entry) =>
      entry.cardId === cardId &&
      (entry.paymentMethod === "CREDIT" || entry.paymentMethod === undefined),
  );
};

export type CardPaymentPayload = {
  cardId: string;
  amount: number;
  paidAt: string;
  note?: string;
};

export const postCardPayment = (payload: CardPaymentPayload) => {
  return apiRequest({
    url: "/api/cards/payments",
    method: "POST",
    data: payload,
  });
};
