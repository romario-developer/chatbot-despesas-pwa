import { apiRequest, getStoredToken } from "./client";
import { api, shouldLogApi } from "../services/api";
import { listEntries } from "./entries";
import type {
  CardInvoice,
  CreditCard,
  Entry,
  InvoiceDetails,
  InvoicePurchase,
  PaymentMethod,
} from "../types";

const CARD_DEBUG_KEY = "DEBUG_CARDS";
const isCardDebugEnabled = () =>
  typeof window !== "undefined" && window.localStorage.getItem(CARD_DEBUG_KEY) === "1";
const logCardDebug = (...args: unknown[]) => {
  if (!isCardDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[card-debug]", ...args);
};

const CREDIT_DEBUG_KEY = "DEBUG_CREDIT";
const isCreditDebugEnabled = () =>
  typeof window !== "undefined" && window.localStorage.getItem(CREDIT_DEBUG_KEY) === "1";
const logCreditInvoiceResponse = (path: string, payload: unknown) => {
  if (!isCreditDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[credit-debug] GET", path, payload);
};

const logCreditDebug = (...args: unknown[]) => {
  if (!isCreditDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[credit-debug]", ...args);
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

const normalizeStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
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

type RawInvoiceDetails = {
  card?: unknown;
  cardId?: unknown;
  cardName?: unknown;
  name?: unknown;
  label?: unknown;
  cycleStart?: unknown;
  cycleEnd?: unknown;
  dueDate?: unknown;
  invoiceTotal?: unknown;
  remaining?: unknown;
  status?: unknown;
  items?: unknown;
  purchases?: unknown;
  transactions?: unknown;
  entries?: unknown;
  data?: unknown;
  list?: unknown;
  balance?: unknown;
  toPay?: unknown;
} | null;

type RawInvoicePurchase = {
  id?: unknown;
  transactionId?: unknown;
  lineId?: unknown;
  description?: unknown;
  title?: unknown;
  name?: unknown;
  amount?: unknown;
  value?: unknown;
  total?: unknown;
  invoiceAmount?: unknown;
  cost?: unknown;
  date?: unknown;
  transactionDate?: unknown;
  createdAt?: unknown;
  category?: unknown;
  categoryName?: unknown;
  categoryLabel?: unknown;
} | null;

const resolveInvoicePurchases = (payload: unknown): RawInvoicePurchase[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  if (Array.isArray(data.purchases)) return data.purchases;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.transactions)) return data.transactions;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.list)) return data.list;
  return [];
};

const normalizeInvoicePurchase = (
  value: RawInvoicePurchase,
  index: number,
): InvoicePurchase | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const description =
    normalizeStringValue(data.description ?? data.title ?? data.name) ??
    `Lancamento ${index + 1}`;
  const amount =
    normalizeNumber(
      data.amount ??
        data.value ??
        data.total ??
        data.invoiceAmount ??
        data.cost,
    ) ?? undefined;
  if (amount === undefined) return null;
  const id =
    normalizeStringValue(data.id ?? data.transactionId ?? data.lineId) ??
    `${description}-${index}`;
  const date = normalizeStringValue(
    data.date ?? data.transactionDate ?? data.createdAt,
  );
  const category = normalizeStringValue(
    data.category ?? data.categoryName ?? data.categoryLabel,
  );
  return {
    id,
    description,
    amount,
    date,
    category,
  };
};

const normalizeInvoiceDetails = (
  value: RawInvoiceDetails,
  requestedCardId: string,
): InvoiceDetails => {
  const data =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const invoiceCardRaw =
    data.card && typeof data.card === "object" ? (data.card as RawCard) : null;
  const card = invoiceCardRaw ? normalizeCard(invoiceCardRaw) : undefined;
  const cardName =
    normalizeStringValue(data.cardName) ??
    normalizeStringValue(data.name) ??
    normalizeStringValue(data.label) ??
    card?.name;
  const cycleStart = normalizeStringValue(data.cycleStart);
  const cycleEnd = normalizeStringValue(data.cycleEnd);
  const dueDate = normalizeStringValue(data.dueDate ?? data.due_day ?? data.dueDay);
  const invoiceTotal = normalizeNumber(
    data.invoiceTotal ?? data.total ?? data.amount ?? data.value,
  );
  const remaining = normalizeNumber(
    data.remaining ?? data.balance ?? data.balanceDue ?? data.toPay,
  );
  const status = normalizeStringValue(
    data.status ?? data.situation ?? data.state,
  );
  const purchasesPayload =
    data.purchases ??
    data.items ??
    data.transactions ??
    data.entries ??
    data.data ??
    data.list;
  const purchases = resolveInvoicePurchases(purchasesPayload)
    .map((item, index) => normalizeInvoicePurchase(item, index))
    .filter((entry): entry is InvoicePurchase => Boolean(entry));

  return {
    cardId: requestedCardId,
    cardName: cardName ?? undefined,
    card: card ?? undefined,
    cycleStart,
    cycleEnd,
    dueDate,
    invoiceTotal,
    remaining,
    status,
    purchases,
  };
};

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

export const buildInvoicesPath = (params?: GetCardInvoicesParams) => {
  const search = new URLSearchParams();
  if (params?.asOf) search.append("asOf", params.asOf);
  if (params?.month) search.append("month", params.month);
  const query = search.toString();
  return query ? `/api/cards/invoices?${query}` : "/api/cards/invoices";
};

export const getCardInvoices = async (
  params?: GetCardInvoicesParams,
): Promise<CardInvoice[]> => {
  const invoicePath = buildInvoicesPath(params);
  const response = await api.request<ListCardInvoicesResponse>({
    url: invoicePath,
    method: "GET",
  });
  logCreditInvoiceResponse(invoicePath, response.data);
  const list = resolveInvoiceList(response.data);
  return list.map((item) => normalizeInvoice(item)).filter(Boolean) as CardInvoice[];
};

export const getCardInvoiceDetails = async (
  cardId: string,
  cycleEnd: string,
): Promise<InvoiceDetails> => {
  const encodedCycleEnd = encodeURIComponent(cycleEnd);
  const data = await apiRequest<RawInvoiceDetails>({
    url: `/api/cards/${cardId}/invoices/${encodedCycleEnd}`,
    method: "GET",
  });
  return normalizeInvoiceDetails(data, cardId);
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
  const dueDate = typeof data.dueDate === "string" ? data.dueDate : undefined;
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
    dueDate,
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

const buildEntriesRequestPath = (params: {
  cardId?: string;
  from?: string;
  to?: string;
  paymentMethod?: PaymentMethod;
}) => {
  const search = new URLSearchParams();
  if (params.from) search.append("from", params.from);
  if (params.to) search.append("to", params.to);
  if (params.cardId) search.append("cardId", params.cardId);
  if (params.paymentMethod) search.append("paymentMethod", params.paymentMethod);
  const query = search.toString();
  return query ? `/api/entries?${query}` : "/api/entries";
};

export const getCreditExpensesByCardAndRange = async ({
  cardId,
  from,
  to,
}: GetCardExpensesParams): Promise<Entry[]> => {
  const formatDateParam = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString().slice(0, 10);
  };
  const params: {
    cardId?: string;
    from?: string;
    to?: string;
    paymentMethod?: PaymentMethod;
  } = {
    cardId,
    from: formatDateParam(from),
    to: formatDateParam(to),
    paymentMethod: "CREDIT",
  };
  const requestPath = buildEntriesRequestPath(params);
  if (isCreditDebugEnabled()) {
    logCreditDebug("GET", requestPath);
  }
  const entries = await listEntries({
    ...params,
  });
  if (isCreditDebugEnabled()) {
    logCreditDebug("RESPONSE", requestPath, entries);
  }

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
