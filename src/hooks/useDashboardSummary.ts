import { useCallback } from "react";
import { apiRequest, waitForApiReady } from "../api/client";
import { dashboardSummaryKey } from "../services/cacheKeys";
import { useLiveQuery } from "./useLiveQuery";

const normalizeNumber = (v: unknown) =>
  Number.isFinite(Number(v)) ? Number(v) : 0;

export function normalizeDashboardSummary(data: any) {
  return {
    month: data?.month,

    balanceCents: normalizeNumber(data?.balance),
    incomeTotalCents: normalizeNumber(data?.incomeTotal),
    expenseTotalCents: normalizeNumber(data?.expenseTotal),

    expenseCashTotalCents: normalizeNumber(data?.expenseTotal),
    expenseCreditTotalCents: 0,

    byCategory: Array.isArray(data?.byCategory)
      ? data.byCategory.map((item: any) => ({
          category: item.categoryName ?? "Sem categoria",
          color: item.color,
          totalCents: normalizeNumber(item?.totalCents ?? item?.total),
        }))
      : [],
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
    return normalizeDashboardSummary(raw);
  }, [month]);
  return useLiveQuery(fetcher, {
    cacheKey: dashboardSummaryKey(month),
    refetchOnFocus: true,
    pollIntervalMs: 20_000,
  });
};
