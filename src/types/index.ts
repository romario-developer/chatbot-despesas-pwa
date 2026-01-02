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

export interface ExtraEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface FixedBill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
}

export interface PlanningData {
  salaryByMonth: Record<string, number>;
  extrasByMonth: Record<string, ExtraEntry[]>;
  fixedBills: FixedBill[];
}
