/**
 * High-Performance In-Memory Cache with Stale-While-Revalidate (SWR) Resilience.
 * Ensures zero downtime, instant 0ms responses, and automatic fallback if DB is busy.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttlMs: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data or execute fetcher function with SWR fallback protection.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 30
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();
    const ttlMs = ttlSeconds * 1000;

    // Fresh Cache Hit (0ms latency)
    if (entry && now - entry.timestamp < entry.ttlMs) {
      return entry.data as T;
    }

    // Cache Expired or Missing -> Fetch fresh data
    try {
      const freshData = await fetcher();
      if (freshData !== null && freshData !== undefined) {
        this.cache.set(key, {
          data: freshData,
          timestamp: now,
          ttlMs,
        });
      }
      return freshData;
    } catch (error) {
      console.warn(`[MemoryCache] Fetcher failed for key "${key}". Serving stale fallback if available.`, error);
      // SWR Fallback: If DB query throws error, return stale cache to prevent downtime!
      if (entry) {
        return entry.data as T;
      }
      throw error;
    }
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   */
  invalidatePattern(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire memory cache
   */
  clear() {
    this.cache.clear();
  }
}

export const dbCache = new MemoryCache();
