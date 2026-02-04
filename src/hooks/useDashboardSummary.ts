import { useCallback } from "react";
import { getDashboardSummary } from "../api/dashboard";
import { waitForApiReady } from "../api/client";
import { dashboardSummaryKey } from "../services/cacheKeys";
import { useLiveQuery } from "./useLiveQuery";

export const useDashboardSummary = (month: string) => {
  const fetcher = useCallback(async () => {
    await waitForApiReady();
    return getDashboardSummary(month);
  }, [month]);
  return useLiveQuery(fetcher, {
    cacheKey: dashboardSummaryKey(month),
    refetchOnFocus: true,
    pollIntervalMs: 20_000,
  });
};
