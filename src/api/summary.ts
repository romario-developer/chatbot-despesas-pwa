import { apiRequest } from "./client";
import type { Summary, SummaryCategory, SummaryDay } from "../types";

type RawSummary = {
  month?: unknown;
  total?: unknown;
  totalPorCategoria?: unknown;
  totalPorDia?: unknown;
} | null;

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCategories = (value: unknown): SummaryCategory[] => {
  if (Array.isArray(value)) {
    return value.map((item) => ({
      category: typeof item?.category === "string" ? item.category : "Sem categoria",
      total: normalizeNumber((item as { total?: unknown })?.total),
    }));
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

const normalizeDays = (value: unknown): SummaryDay[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        date: typeof item?.date === "string" ? item.date : "",
        total: normalizeNumber((item as { total?: unknown })?.total),
      }))
      .filter((item) => item.date);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([date, total]) => ({
        date,
        total: normalizeNumber(total),
      }))
      .filter((item) => item.date);
  }

  return [];
};

export const getSummary = async (month: string): Promise<Summary> => {
  const search = new URLSearchParams({ month });
  const data = await apiRequest<RawSummary>({
    url: `/api/summary?${search.toString()}`,
    method: "GET",
  });

  const total = normalizeNumber(data?.total);
  const totalPorCategoria = normalizeCategories(data?.totalPorCategoria);
  const totalPorDia = normalizeDays(data?.totalPorDia);
  const monthValue = typeof data?.month === "string" ? data.month : month;

  return { month: monthValue, total, totalPorCategoria, totalPorDia };
};
