export type AuthUser = {
  name?: string;
  email?: string;
};

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  mustChangePassword?: boolean;
  user?: AuthUser;
  name?: string;
  email?: string;
}

export type UserMe = {
  name?: string;
  email?: string;
  telegramChatId?: string | number;
  telegramId?: string | number;
};

export interface Entry {
  id: string;
  description: string;
  amount: number;
  category: string;
  categoryId?: string | null;
  categoryInferred?: boolean;
  date: string;
  source: string;
  paymentMethod?: PaymentMethod;
  cardId?: string | null;
  createdAt: string;
  updatedAt: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
}

export type SummaryCategory = {
  category: string;
  total: number;
};

export type SummaryDay = {
  date: string;
  total: number;
};

export type Summary = {
  month: string;
  total: number;
  totalPorCategoria: SummaryCategory[];
  totalPorDia: SummaryDay[];
};

export type DashboardCategory = {
  category: string;
  total: number;
  color?: string;
};

export type DashboardSummary = {
  month: string;
  balance: number;
  incomeTotal: number;
  expenseCashTotal: number;
  expenseCreditTotal: number;
  expenseTotal: number;
  byCategory: DashboardCategory[];
};

export type Category = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type CategoriesResponse =
  | Category[]
  | {
      categories?: Category[];
      data?: Category[];
      items?: Category[];
    }
  | null;

export type EntriesResponse = Entry[];

export interface EntryPayload {
  description: string;
  amount: number;
  category?: string;
  categoryId?: string | null;
  date: string;
  source?: string;
  paymentMethod?: PaymentMethod;
  cardId?: string | null;
}

export type PaymentMethod =
  | "PIX"
  | "CASH"
  | "DEBIT"
  | "CREDIT"
  | "TRANSFER"
  | "OTHER";

export type CreditCard = {
  id: string;
  name: string;
  brand?: string;
  limit: number;
  closingDay?: number;
  dueDay?: number;
  color?: string;
  textColor?: string;
};

export type CardInvoice = {
  cardId: string;
  name: string;
  cardName?: string;
  brand?: string;
  color?: string;
  textColor?: string;
  invoiceTotal: number;
  nextInvoiceTotal?: number;
  closingDay?: number;
  dueDay?: number;
  cycleStart?: string;
  cycleEnd?: string;
  entriesCount?: number;
  paidTotal?: number;
  remaining?: number;
  status?: string;
};

export type PlanningExtra = {
  id: string;
  label?: string;
  amount: number;
  description?: string;
  date?: string;
};

export type PlanningBill = {
  id: string;
  label?: string;
  amount: number;
  dueDay?: number;
  name?: string;
};

export type Planning = {
  salaryByMonth: Record<string, number>;
  extrasByMonth: Record<string, PlanningExtra[]>;
  fixedBills: PlanningBill[];
};

export const DEFAULT_PLANNING: Planning = {
  salaryByMonth: {},
  extrasByMonth: {},
  fixedBills: [],
};

export type ExtraEntry = PlanningExtra;
export type FixedBill = PlanningBill;
export type PlanningData = Planning;
