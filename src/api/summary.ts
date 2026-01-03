import { apiFetch } from "./client";
import type { Summary } from "../types";

type RawSummary = {
  total?: unknown;
  totalPorCategoria?: unknown;
  totalPorDia?: unknown;
} | null;

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeRecord = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const result: Record<string, number> = {};

  for (const [key, val] of entries) {
    result[key] = normalizeNumber(val);
  }

  return result;
};

export const getSummary = async (month: string): Promise<Summary> => {
  const search = new URLSearchParams({ month });
  const data = await apiFetch<RawSummary>(`/api/summary?${search.toString()}`);

  if (!data || typeof data !== "object") {
    return { total: 0, totalPorCategoria: {}, totalPorDia: {} };
  }

  const total = normalizeNumber((data as { total?: unknown }).total);
  const totalPorCategoria = normalizeRecord(
    (data as { totalPorCategoria?: unknown }).totalPorCategoria,
  );
  const totalPorDia = normalizeRecord((data as { totalPorDia?: unknown }).totalPorDia);

  return { total, totalPorCategoria, totalPorDia };
};
