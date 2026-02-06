import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEntries } from "../../api/entries";
import type { Entry } from "../../types";
import { monthToRange } from "../../utils/dateRange";
import { entriesQueryKey } from "../../services/queryKeys";

export type UseEntriesOptions = {
  pollIntervalMs?: number;
  enabled?: boolean;
};

export const useEntries = (month: string, options: UseEntriesOptions = {}) => {
  const range = useMemo(() => monthToRange(month), [month]);

  return useQuery<Entry[]>({
    queryKey: entriesQueryKey(month),
    queryFn: () =>
      listEntries({
        from: range.from,
        to: range.to,
      }),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: options.pollIntervalMs ?? 0,
    enabled: options.enabled ?? true,
  });
};
