export interface AuthResponse {
  token: string;
}

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

export interface Summary {
  total: number;
  totalPorCategoria: Record<string, number>;
  totalPorDia: Record<string, number>;
}

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
