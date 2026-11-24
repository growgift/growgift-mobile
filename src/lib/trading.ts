// Pure helpers for the Buy / Sell page (no React, no fetch) so they can be
// unit-tested directly. Nothing here ever sees a ViewTrade token or session:
// the browser only ever knows {side, symbol, quantity}, a client-generated
// idempotency key, and the order result the backend chooses to return.

export type Side = "BUY" | "SELL";

export type OrderState =
  | "accepted"
  | "pending"
  | "partiallyfilled"
  | "filled"
  | "rejected"
  | "failed"
  | "unconfirmed";

export type OrderResult = {
  state: OrderState;
  orderRef?: string | null;
  status?: string | null;
  message: string;
  /** Quantity the server actually ordered (it resolves "sell all" itself). */
  quantity?: number | null;
  symbol?: string;
};

export const MAX_ORDER_QUANTITY = 10_000;

export const MAX_SELL_DECIMALS = 6;
/** Tolerance for comparing share quantities (matches the backend's SellPlanner). */
export const QTY_EPSILON = 0.000001;
const SELL_QTY_RE = new RegExp(`^(\\d+|\\d*\\.\\d{1,${MAX_SELL_DECIMALS}}|\\d+\\.\\d{1,${MAX_SELL_DECIMALS}})$`);

const SYMBOL_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export type OrderForm = { side: Side; symbol: string; quantity: string };

export function normaliseSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Client-side check for fast feedback only — the backend re-validates everything. */
export function validateOrderForm(f: OrderForm, held?: { symbol: string; quantity: number }[]):
  | { ok: true; symbol: string; quantity: number }
  | { ok: false; message: string } {
  const symbol = normaliseSymbol(f.symbol);
  if (!SYMBOL_RE.test(symbol)) return { ok: false, message: "Enter a valid ticker symbol, e.g. AAPL." };
  // Buying is whole shares; selling may be fractional because gifted holdings are (e.g. 0.02029).
  const pattern = f.side === "SELL" ? SELL_QTY_RE : /^\d+$/;
  if (!pattern.test(f.quantity.trim()))
    return { ok: false, message: f.side === "SELL" ? `Enter a quantity with at most ${MAX_SELL_DECIMALS} decimal places.` : "Quantity must be a whole number of shares." };
  const quantity = Number(f.quantity.trim());
  if (quantity <= 0) return { ok: false, message: "Quantity must be greater than zero." };
  if (quantity > MAX_ORDER_QUANTITY)
    return { ok: false, message: `Quantity can't exceed ${MAX_ORDER_QUANTITY.toLocaleString("en-AU")} shares per order.` };
  if (f.side === "SELL" && held) {
    const h = held.find((x) => x.symbol.toUpperCase() === symbol);
    // Only a hint: holdings data may be unavailable, and ViewTrade is the authority.
    if (held.length > 0 && !h) return { ok: false, message: `You don't appear to hold ${symbol}.` };
    if (h && quantity > h.quantity + QTY_EPSILON) return { ok: false, message: `You only hold ${h.quantity} share${h.quantity === 1 ? "" : "s"} of ${symbol}.` };
  }
  return { ok: true, symbol, quantity };
}

/** One key per deliberate order attempt. Reused on a retry of the SAME attempt, never across attempts. */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.padEnd(12, "0");
}

export type StateView = { title: string; tone: "good" | "warn" | "bad"; final: boolean };

/** Accepted ≠ executed: only "filled" is ever described as complete. */
export function describeState(s: OrderState): StateView {
  switch (s) {
    case "filled":
      return { title: "Order filled", tone: "good", final: true };
    case "partiallyfilled":
      return { title: "Order partly filled", tone: "warn", final: false };
    case "pending":
      return { title: "Order pending", tone: "warn", final: false };
    case "accepted":
      return { title: "Order accepted — not yet executed", tone: "warn", final: false };
    case "rejected":
      return { title: "Order rejected", tone: "bad", final: true };
    case "failed":
      return { title: "Order not placed", tone: "bad", final: true };
    case "unconfirmed":
      return { title: "We couldn't confirm this order", tone: "warn", final: false };
  }
}

export function ineligibleMessage(reason: string | null | undefined): { text: string; href?: string; cta?: string } {
  switch (reason) {
    case "child_account":
      return { text: "Child logins can view their portfolio but can't place trades." };
    case "kyc_required":
      return { text: "Finish identity verification before you can trade.", href: "/kyc", cta: "Verify identity" };
    case "no_account":
      return { text: "You don't have a brokerage account yet. It's created when you redeem your first gift.", href: "/redeem", cta: "Redeem a gift" };
    case "not_configured":
      return { text: "Trading isn't available right now. Please try again later." };
    default:
      return { text: "Your account isn't eligible to trade." };
  }
}

// ---------------------------------------------------------------------------
// Selling from My Profile: full or partial.
// ---------------------------------------------------------------------------

export type SellMode = "all" | "part";

export type SellCheck =
  | { ok: true; quantity: number; sellAll: boolean }
  | { ok: false; message: string };


/**
 * Validates a sell of a holding the page already knows about. "all" never sends a number a user typed: the server
 * resolves the exact position. A partial amount that equals (or nearly equals) the whole position is promoted to
 * "sell all", so no sliver is left behind. Hint only — the server and ViewTrade re-check everything.
 */
export function checkSell(held: number, mode: SellMode, input: string): SellCheck {
  if (!(held > 0)) return { ok: false, message: "You don't hold any shares of this to sell." };
  if (mode === "all") return { ok: true, quantity: held, sellAll: true };
  const text = input.trim();
  if (!text) return { ok: false, message: "Enter how many shares to sell." };
  if (!SELL_QTY_RE.test(text))
    return { ok: false, message: `Enter a number with at most ${MAX_SELL_DECIMALS} decimal places.` };
  const q = Number(text);
  if (!(q > 0)) return { ok: false, message: "Quantity must be greater than zero." };
  if (q > held + QTY_EPSILON)
    return { ok: false, message: `You only hold ${formatQty(held)} share${held === 1 ? "" : "s"}.` };
  if (q >= held - QTY_EPSILON) return { ok: true, quantity: held, sellAll: true };
  return { ok: true, quantity: q, sellAll: false };
}

/** A fraction of the position, rounded DOWN to the sell precision so it can never exceed what is held. */
export function quantityForFraction(held: number, fraction: number): number {
  const f = 10 ** MAX_SELL_DECIMALS;
  return Math.floor(held * fraction * f + 1e-9) / f;
}

export function formatQty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: MAX_SELL_DECIMALS });
}

/** Rough value of a sale at the last price. null when there's no price. An estimate only: market orders fill at the market price. */
export function estimateProceeds(quantity: number, lastPrice: number | null | undefined): number | null {
  return typeof lastPrice === "number" && lastPrice > 0 ? Math.round(quantity * lastPrice * 100) / 100 : null;
}

/** Plain-English reasons the Sell button is unavailable (or null if it can be offered). */
export function sellUnavailableReason(canTrade: boolean | null, reason: string | null | undefined): string | null {
  if (canTrade === null) return "Checking whether you can trade…";
  return canTrade ? null : ineligibleMessage(reason).text;
}
