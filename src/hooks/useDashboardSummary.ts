import { useCallback } from "react";
import { apiRequest, waitForApiReady } from "../api/client";
import { dashboardSummaryKey } from "../services/cacheKeys";
import { useLiveQuery } from "./useLiveQuery";

const asNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const asInt = (v: unknown) => {
  const n = asNumber(v);
  return Number.isInteger(n) ? n : Math.round(n);
};

export function normalizeDashboardSummary(raw: any) {
  const month = typeof raw?.month === "string" ? raw.month : "";

  const balanceCents = asInt(raw?.balanceCents ?? raw?.balance);
  const incomeTotalCents = asInt(raw?.incomeTotalCents ?? raw?.incomeTotal);
  const expenseTotalCents = asInt(raw?.expenseTotalCents ?? raw?.expenseTotal);

  const expenseCashTotalCents =
    raw?.gastosCaixaCents != null
      ? asInt(raw.gastosCaixaCents)
      : expenseTotalCents;

  const expenseCreditTotalCents =
    raw?.gastosCreditoCents != null ? asInt(raw.gastosCreditoCents) : 0;

  const byCategory = Array.isArray(raw?.byCategory)
    ? raw.byCategory.map((item: any) => ({
        category: item.categoryName ?? item.category ?? "Sem categoria",
        color: item.color,
        totalCents: asInt(item.totalCents ?? item.total),
      }))
    : [];

  return {
    month,
    balanceCents,
    incomeTotalCents,
    expenseTotalCents,
    expenseCashTotalCents,
    expenseCreditTotalCents,
    byCategory,
  };
}

export const useDashboardSummary = (month: string) => {
  const fetcher = useCallback(async () => {
    await waitForApiReady();
    const search = new URLSearchParams({ month });
    const raw = await apiRequest({
      url: `/api/summary?${search.toString()}`,
      method: "GET",
      dashboardDebug: { label: "dashboard-summary" },
    });
    console.log("[summary-raw]", raw);
    const normalized = normalizeDashboardSummary(raw);
    console.log("[summary-normalized]", normalized);
    return normalized;
  }, [month]);
  return useLiveQuery(fetcher, {
    cacheKey: dashboardSummaryKey(month),
    refetchOnFocus: true,
    pollIntervalMs: 20_000,
  });
};
