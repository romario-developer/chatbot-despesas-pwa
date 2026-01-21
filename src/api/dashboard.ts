import { apiRequest } from "./client";
import type { DashboardCategory, DashboardSummary } from "../types";

type RawCategory = {
  category?: unknown;
  categoryName?: unknown;
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
  expenseCashTotal?: unknown;
  expenseCreditTotal?: unknown;
  expense_cash_total?: unknown;
  expense_credit_total?: unknown;
  byCategory?: unknown;
} | null;

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCategory = (value: RawCategory): DashboardCategory | null => {
  const label =
    typeof value.categoryName === "string"
      ? value.categoryName
      : typeof value.category === "string"
        ? value.category
        : typeof value.name === "string"
          ? value.name
          : "";
  const total = normalizeNumber(value.total ?? value.amount);
  if (!label) return null;
  const color = typeof value.color === "string" ? value.color : undefined;
  return {
    category: label,
    total,
    color,
  };
};

const normalizeCategories = (value: unknown): DashboardCategory[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCategory(item as RawCategory))
      .filter(Boolean) as DashboardCategory[];
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([category, total]) => ({
        category,
        total: normalizeNumber(total),
      }))
      .filter((item) => Boolean(item.category));
  }

  return [];
};

export const getDashboardSummary = async (month: string): Promise<DashboardSummary> => {
  const search = new URLSearchParams({ month });
  const data = await apiRequest<RawDashboardSummary>({
    url: `/api/dashboard/summary?${search.toString()}`,
    method: "GET",
    dashboardDebug: { label: "dashboard-summary" },
  });

  return {
    month: typeof data?.month === "string" ? data.month : month,
    balance: normalizeNumber(data?.balance),
    incomeTotal: normalizeNumber(data?.incomeTotal),
    expenseCashTotal: normalizeNumber(
      data?.expenseCashTotal ?? data?.expense_cash_total,
    ),
    expenseCreditTotal: normalizeNumber(
      data?.expenseCreditTotal ?? data?.expense_credit_total,
    ),
    expenseTotal: normalizeNumber(data?.expenseTotal),
    byCategory: normalizeCategories(data?.byCategory),
  };
};
