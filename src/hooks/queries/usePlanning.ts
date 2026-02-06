import { useQuery } from "@tanstack/react-query";
import { getPlanning } from "../../api/planning";
import { planningQueryKey } from "../../services/queryKeys";
import { DEFAULT_PLANNING, type Planning } from "../../types";

export const usePlanning = (month: string) => {
  const result = useQuery<Planning>({
    queryKey: planningQueryKey(month),
    queryFn: () => getPlanning(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20_000,
    enabled: Boolean(month),
  });

  const planning = result.data ?? DEFAULT_PLANNING;
  const salary = planning.salaryByMonth?.[month] ?? 0;
  const extras = Array.isArray(planning.extrasByMonth?.[month])
    ? planning.extrasByMonth[month]
    : [];

  return {
    ...result,
    planning,
    salary,
    extras,
  };
};
