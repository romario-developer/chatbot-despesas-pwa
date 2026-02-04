import { useCallback, useMemo } from "react";
import { listEntries } from "../api/entries";
import { monthToRange } from "../utils/dateRange";
import { entriesKey } from "../services/cacheKeys";
import { useLiveQuery } from "./useLiveQuery";

type UseEntriesOptions = {
  pollIntervalMs?: number;
  enabled?: boolean;
};

export const useEntries = (month: string, options: UseEntriesOptions = {}) => {
  const range = useMemo(() => monthToRange(month), [month]);
  const fetcher = useCallback(
    () =>
      listEntries({
        from: range.from,
        to: range.to,
      }),
    [range.from, range.to],
  );

  return useLiveQuery(fetcher, {
    cacheKey: entriesKey(month),
    queryDeps: [range.from, range.to],
    refetchOnFocus: true,
    pollIntervalMs: options.pollIntervalMs ?? 0,
    enabled: options.enabled ?? true,
  });
};
