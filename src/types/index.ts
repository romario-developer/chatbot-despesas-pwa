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
