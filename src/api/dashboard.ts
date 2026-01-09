import { apiRequest } from "./client";
import type { DashboardCategory, DashboardSummary } from "../types";

type RawCategory = {
  category?: unknown;
  name?: unknown;
  total?: unknown;
  amount?: unknown;
  color?: unknown;
};

type RawDashboardSummary = {
  month?: unknown;
  balance?: unknown;
  incomeTotal?: unknown;
  expenseTotal?: unknown;
  byCategory?: unknown;
} | null;

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCategory = (value: RawCategory, fallbackLabel: string): DashboardCategory => {
  const label =
    typeof value.category === "string"
      ? value.category
      : typeof value.name === "string"
        ? value.name
        : fallbackLabel;
  const total = normalizeNumber(value.total ?? value.amount);
  const color = typeof value.color === "string" ? value.color : undefined;
  return {
    category: label || fallbackLabel,
    total,
    color,
  };
};

const normalizeCategories = (value: unknown): DashboardCategory[] => {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeCategory(item as RawCategory, `Categoria ${index + 1}`),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(
      ([category, total]) => ({
        category,
        total: normalizeNumber(total),
      }),
    );
  }

  return [];
};

export const getDashboardSummary = async (month: string): Promise<DashboardSummary> => {
  const search = new URLSearchParams({ month });
  const data = await apiRequest<RawDashboardSummary>({
    url: `/api/dashboard/summary?${search.toString()}`,
    method: "GET",
  });

  return {
    month: typeof data?.month === "string" ? data.month : month,
    balance: normalizeNumber(data?.balance),
    incomeTotal: normalizeNumber(data?.incomeTotal),
    expenseTotal: normalizeNumber(data?.expenseTotal),
    byCategory: normalizeCategories(data?.byCategory),
  };
};
