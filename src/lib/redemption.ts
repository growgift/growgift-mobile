// Remembers the gift code a visitor has entered so it survives the trip
// through login / signup / identity checks without being passed around in
// URLs (URLs end up in history, referrers, server logs and analytics).
//
// Stored in sessionStorage: tab-scoped, cleared when the tab closes, never
// sent to a server. Expires after 30 minutes. Dependency-free for unit tests.

export const PENDING_KEY = "gg_pending_redemption";
export const PENDING_TTL_MS = 30 * 60 * 1000;

const CODE_SHAPE = /^GG-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PendingRedemption = { code: string; createdAt: number };

export function browserStore(): KV | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // storage disabled / blocked
  }
}

export function isValidCodeShape(code: string): boolean {
  return CODE_SHAPE.test(code);
}

export function savePending(code: string, store: KV | null = browserStore(), now = Date.now()): boolean {
  if (!store || !isValidCodeShape(code)) return false;
  try {
    store.setItem(PENDING_KEY, JSON.stringify({ code, createdAt: now } satisfies PendingRedemption));
    return true;
  } catch {
    return false;
  }
}

/** Returns the pending redemption, or null if absent, malformed or expired (and cleans up in those cases). */
export function loadPending(store: KV | null = browserStore(), now = Date.now()): PendingRedemption | null {
  if (!store) return null;
  try {
    const raw = store.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRedemption>;
    if (
      typeof parsed.code !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !isValidCodeShape(parsed.code) ||
      now - parsed.createdAt > PENDING_TTL_MS ||
      parsed.createdAt > now + 60_000
    ) {
      store.removeItem(PENDING_KEY);
      return null;
    }
    return { code: parsed.code, createdAt: parsed.createdAt };
  } catch {
    try {
      store.removeItem(PENDING_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearPending(store: KV | null = browserStore()): void {
  try {
    store?.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPending(store: KV | null = browserStore(), now = Date.now()): boolean {
  return loadPending(store, now) !== null;
}
