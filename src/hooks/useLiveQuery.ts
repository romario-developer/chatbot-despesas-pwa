import { useCallback, useEffect, useRef, useState } from "react";
import { getCacheVersion, subscribeCacheKey } from "../services/liveQueryCache";

export type UseLiveQueryOptions = {
  cacheKey: string;
  queryDeps?: unknown[];
  refetchOnFocus?: boolean;
  pollIntervalMs?: number;
  enabled?: boolean;
};

export type LiveQueryResult<T> = {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: (options?: { silent?: boolean }) => Promise<T | undefined>;
};

export const useLiveQuery = <T>(
  fetcher: () => Promise<T>,
  options: UseLiveQueryOptions,
): LiveQueryResult<T> => {
  const {
    cacheKey,
    queryDeps = [],
    refetchOnFocus = true,
    pollIntervalMs = 0,
    enabled = true,
  } = options;

  const [state, setState] = useState<{
    data: T | undefined;
    error: Error | null;
    isLoading: boolean;
    isFetching: boolean;
  }>({
    data: undefined,
    error: null,
    isLoading: enabled,
    isFetching: false,
  });
  const [invalidatedVersion, setInvalidatedVersion] = useState(() => getCacheVersion(cacheKey));
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setInvalidatedVersion(getCacheVersion(cacheKey));
    const unsubscribe = subscribeCacheKey(cacheKey, () => {
      setInvalidatedVersion((prev) => prev + 1);
    });
    return unsubscribe;
  }, [cacheKey]);

  const fetchData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!enabled) return undefined;
      const requestId = ++requestIdRef.current;
      setState((prev) => ({
        data: prev.data,
        error: options?.silent ? prev.error : null,
        isLoading: options?.silent ? prev.isLoading : true,
        isFetching: true,
      }));

      try {
        const payload = await fetcher();
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return payload;
        }
        setState({
          data: payload,
          error: null,
          isLoading: false,
          isFetching: false,
        });
        return payload;
      } catch (error) {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return undefined;
        }
        setState((prev) => ({
          data: prev.data,
          error: error instanceof Error ? error : new Error("Erro ao carregar dados"),
          isLoading: false,
          isFetching: false,
        }));
        throw error;
      }
    },
    [enabled, fetcher],
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchData();
  }, [cacheKey, invalidatedVersion, enabled, fetchData, ...queryDeps]);

  useEffect(() => {
    if (!refetchOnFocus || typeof window === "undefined") return undefined;
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchData({ silent: true });
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
    };
  }, [fetchData, refetchOnFocus]);

  useEffect(() => {
    if (!pollIntervalMs || typeof window === "undefined") return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchData({ silent: true });
      }
    }, pollIntervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchData, pollIntervalMs]);

  const refetch = useCallback(
    (options?: { silent?: boolean }) => fetchData(options),
    [fetchData],
  );

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    refetch,
  };
};
