import { QueryClient } from "@tanstack/react-query";
import {
  cardsSummaryQueryKey,
  dashboardSummaryQueryKey,
  entriesQueryKey,
  planningQueryKey,
} from "../services/queryKeys";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 0,
    },
  },
});

export const invalidateEntriesForMonth = (month: string) =>
  queryClient.invalidateQueries({ queryKey: entriesQueryKey(month) });

export const invalidateDashboardForMonth = (month: string) =>
  queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey(month) });

export const invalidatePlanningForMonth = (month: string) =>
  queryClient.invalidateQueries({ queryKey: planningQueryKey(month) });

export const invalidateMonthCaches = (month: string) => {
  invalidateEntriesForMonth(month);
  invalidateDashboardForMonth(month);
  invalidatePlanningForMonth(month);
};

export const invalidateCardsSummary = () =>
  queryClient.invalidateQueries({ queryKey: cardsSummaryQueryKey() });
