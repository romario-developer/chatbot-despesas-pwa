type CacheListener = () => void;

const cacheVersions = new Map<string, number>();
const cacheListeners = new Map<string, Set<CacheListener>>();

export const getCacheVersion = (key: string) => cacheVersions.get(key) ?? 0;

export const subscribeCacheKey = (key: string, listener: CacheListener) => {
  const listeners = cacheListeners.get(key) ?? new Set();
  listeners.add(listener);
  cacheListeners.set(key, listeners);

  return () => {
    const current = cacheListeners.get(key);
    if (!current) return;
    current.delete(listener);
    if (!current.size) {
      cacheListeners.delete(key);
    }
  };
};

export const invalidateCacheKey = (key: string) => {
  const nextVersion = (cacheVersions.get(key) ?? 0) + 1;
  cacheVersions.set(key, nextVersion);
  const listeners = cacheListeners.get(key);
  if (!listeners) return;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // swallow errors to avoid breaking other subscribers
    }
  });
};

export const invalidateCacheKeys = (keys: string[]) => {
  keys.forEach((key) => invalidateCacheKey(key));
};
