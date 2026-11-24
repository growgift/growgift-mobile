import { ApiError } from "./api";

/** One friendly sentence for any failure; never shows raw server text for unknown errors. */
export function friendly(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof ApiError) {
    if (e.code === "network" || e.code === "unauthorized") return e.message;
    if (e.status === 402 || e.code === "subscription.required") return "A subscription is needed for this. Open Profile to manage it.";
    if (e.status === 429) return "Too many attempts. Please wait a moment and try again.";
    if (e.message && e.status < 500) return e.message;
  }
  return fallback;
}
