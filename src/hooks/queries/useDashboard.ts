import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "../../api/dashboard";
import type { DashboardSummary } from "../../types";
import { dashboardSummaryQueryKey } from "../../services/queryKeys";

export const useDashboard = (month: string) =>
  useQuery<DashboardSummary>({
    queryKey: dashboardSummaryQueryKey(month),
    queryFn: () => getDashboardSummary(month),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20_000,
    enabled: Boolean(month),
  });
