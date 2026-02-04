import { useCallback } from "react";
import { getPlanning } from "../api/planning";
import { planningKey } from "../services/cacheKeys";
import { useLiveQuery } from "./useLiveQuery";
import { DEFAULT_PLANNING, type Planning } from "../types";

export type UsePlanningResult = {
  planning: Planning;
  salary: number;
  extras: Planning["extrasByMonth"][string];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: (options?: { silent?: boolean }) => Promise<Planning | undefined>;
};

export const usePlanning = (month: string): UsePlanningResult => {
  const fetcher = useCallback(() => getPlanning(), []);
  const result = useLiveQuery(fetcher, {
    cacheKey: planningKey(month),
    queryDeps: [month],
    refetchOnFocus: true,
    pollIntervalMs: 20_000,
  });

  const planning = result.data ?? DEFAULT_PLANNING;
  const salary = planning.salaryByMonth[month] ?? 0;
  const extras = Array.isArray(planning.extrasByMonth[month])
    ? planning.extrasByMonth[month]
    : [];

  return {
    planning,
    salary,
    extras,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
};
