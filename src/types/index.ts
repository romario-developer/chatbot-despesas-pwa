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
  date: string;
  source: string;
  createdAt: string;
  updatedAt: string;
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

export type EntriesResponse = Entry[];

export type CategoriesResponse = string[];

export interface EntryPayload {
  description: string;
  amount: number;
  category: string;
  date: string;
  source?: string;
}

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
