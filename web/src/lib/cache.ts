/**
 * Tiny client-side cache.
 *
 * Lives in module scope, so it survives client-side navigation between pages
 * and is thrown away on a hard reload. That is exactly the lifetime we want:
 * moving Dashboard -> Courses -> Dashboard should be instant, but a refresh
 * should always show the truth.
 *
 * Usage:
 *   const courses = await cached("courses", () =>
 *     supabase.from("courses").select("*").eq("user_id", uid)
 *   );
 *
 * After a write:
 *   invalidate("courses");
 */

type Entry = { data: any; expires: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<any>>();

const TTL_MS = 60_000;

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = TTL_MS
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.data as T;
  }

  // If the same key is already being fetched, wait on that instead of firing
  // a second identical request. Two components mounting at once is common.
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const data = await fetcher();
      store.set(key, { data, expires: Date.now() + ttl });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/** Drop one key, or every key starting with a prefix. */
export function invalidate(prefix: string) {
  for (const k of Array.from(store.keys())) {
    if (k === prefix || k.startsWith(prefix + ":")) store.delete(k);
  }
}

/** Drop everything. Call on sign out. */
export function invalidateAll() {
  store.clear();
  inflight.clear();
}

/** Overwrite a cached value without refetching, for optimistic updates. */
export function setCached(key: string, data: any, ttl: number = TTL_MS) {
  store.set(key, { data, expires: Date.now() + ttl });
}
