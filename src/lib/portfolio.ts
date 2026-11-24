export type Holding = {
  symbol: string;
  quantity: number;
  /** null when ViewTrade hasn't priced the holding (e.g. market closed). */
  marketValue: number | null;
  costBasis: number;
  avgPrice?: number | null;
  currency?: string;
  lastPrice?: number | null;
  /** Today's move in percent (already a percent, e.g. 0.575 = +0.575%). */
  changePercent?: number | null;
  unrealisedPnl?: number | null;
  unrealisedPnlPercent?: number | null;
};

export function formatShares(q: number): string {
  // Fractional shares are real here (e.g. 0.02029) — never round them to 0.
  return q.toLocaleString("en-US", { maximumFractionDigits: 5 });
}

export function formatMoney(n: number, currency = "USD"): string {
  return `${currency === "USD" ? "US$" : currency + " "}${n.toFixed(2)}`;
}

export function holdingValueLabel(h: Holding): string {
  return h.marketValue === null || h.marketValue === undefined
    ? "Price not available"
    : formatMoney(h.marketValue, h.currency);
}

export function totalCost(holdings: Holding[]): number {
  return Math.round(holdings.reduce((s, h) => s + (h.costBasis || 0), 0) * 100) / 100;
}

export function portfolioErrorMessage(err: unknown): string {
  const e = err as { message?: string; status?: number } | null;
  return e?.message && e.status ? e.message : "Couldn't load your portfolio.";
}

/** What My Profile says for a user with no linked account, by the backend's existing-account decision. */
export function unlinkedMessage(decision: string): { text: string; cta?: { href: string; label: string } } {
  switch (decision) {
    case "pending_review":
      return { text: "ViewTrade is still processing your brokerage application. Your portfolio will appear here once your account is issued." };
    case "continue_onboarding":
      return { text: "Your ViewTrade application isn't finished yet.", cta: { href: "/kyc", label: "Continue your application" } };
    case "email_unverified":
      return { text: "Verify your email address and we'll look for an existing ViewTrade account to link." };
    case "not_eligible":
      return { text: "ViewTrade reports your account can't be used right now. Please contact support." };
    case "ambiguous":
      return { text: "We found more than one possible ViewTrade record for your email, so we haven't linked any. Please contact support." };
    case "start_onboarding":
    default:
      return {
        text: "You don't have a brokerage account linked yet. One is opened the first time you redeem a gift.",
        cta: { href: "/redeem", label: "Redeem a code" },
      };
  }
}

export function formatPrice(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toFixed(2);
}

export function formatPercent(n: number | null | undefined, digits = 2, signed = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function pnlTone(n: number | null | undefined): "up" | "down" | "flat" {
  return n === null || n === undefined || n === 0 ? "flat" : n > 0 ? "up" : "down";
}

export type Slice = { symbol: string; value: number; share: number };

/** Allocation by current market value; unpriced holdings are left out (they have no value to share). */
export function allocationSlices(holdings: Holding[]): Slice[] {
  const priced = holdings.filter((h) => (h.marketValue ?? 0) > 0);
  const total = priced.reduce((s, h) => s + (h.marketValue as number), 0);
  if (total <= 0) return [];
  return priced
    .map((h) => ({ symbol: h.symbol, value: h.marketValue as number, share: (h.marketValue as number) / total }))
    .sort((a, b) => b.value - a.value);
}

export function portfolioTotals(holdings: Holding[]) {
  const priced = holdings.filter((h) => h.marketValue !== null && h.marketValue !== undefined);
  const value = priced.reduce((s, h) => s + (h.marketValue as number), 0);
  const costOfPriced = priced.reduce((s, h) => s + (h.costBasis || 0), 0);
  const allPriced = priced.length === holdings.length && holdings.length > 0;
  const pnl = allPriced && costOfPriced > 0 ? value - costOfPriced : null;
  return {
    marketValue: allPriced ? Math.round(value * 100) / 100 : null,
    cost: totalCost(holdings),
    pnl: pnl === null ? null : Math.round(pnl * 100) / 100,
    pnlPercent: pnl === null ? null : (pnl / costOfPriced) * 100,
  };
}

export type Redemption = {
  giftId: string;
  symbol: string;
  amount: number;
  currency: string;
  usdAmount: number | null;
  state: string;
  orderRef: string;
  /** Masked ViewTrade account the order was sent to. */
  account?: string;
  canRetry: boolean;
  /** Development only: the order is unconfirmed, and the tester can assert they checked ViewTrade and none exists. */
  canRetryIfNoOrderExists?: boolean;
  purchasedAtUtc: string;
};

export function redemptionStateLabel(state: string): { text: string; tone: "ok" | "wait" | "bad" } {
  switch (state) {
    case "filled":
      return { text: "Bought", tone: "ok" };
    case "accepted":
    case "pending":
    case "partiallyfilled":
      return { text: "Order accepted by ViewTrade — not filled yet (US markets must be open to fill it)", tone: "wait" };
    case "unconfirmed":
      return { text: "Order sent, but ViewTrade's reply couldn't be confirmed — check your ViewTrade orders before buying again", tone: "wait" };
    case "rejected":
      return { text: "ViewTrade rejected the order", tone: "bad" };
    case "needs_attention":
      return { text: "Not bought yet — we couldn't place the order. Use Retry purchase", tone: "bad" };
    default:
      return { text: state, tone: "wait" };
  }
}

export type OpenOrder = {
  orderRef: string;
  symbol: string;
  side: string;
  orderType: string;
  validity?: string | null;
  currency: string;
  expectedValue?: number | null;
  quantity?: number | null;
  remainingQuantity?: number | null;
  executedQuantity?: number | null;
  expectedPrice?: number | null;
  createdUtc?: string | null;
  createdRaw?: string | null;
  cancelable?: boolean | null;
};

/** "Buy US$32.27 of RBLX" for dollar (Notional) orders, "Buy 5 RBLX" otherwise. */
export function describeOrder(o: OpenOrder): string {
  const verb = o.side === "SELL" ? "Sell" : o.side === "BUY" ? "Buy" : o.side;
  if (o.orderType.toLowerCase() === "notional" && o.expectedValue != null)
    return `${verb} ${formatMoney(o.expectedValue, o.currency)} of ${o.symbol}`;
  return `${verb} ${o.quantity != null ? formatShares(o.quantity) + " " : ""}${o.symbol}`;
}

export function openOrderTiming(o: OpenOrder): string {
  const d = o.createdUtc ? new Date(o.createdUtc) : null;
  const placed = d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : o.createdRaw ?? "";
  return placed ? `Placed ${placed}` : "";
}

/** The one-line reason shown above the list, so a waiting order isn't mistaken for a missing one. */
export const OPEN_ORDERS_EXPLAINER =
  "These orders have been accepted by ViewTrade but not filled yet. Once the US market opens and an order fills, a buy appears in your holdings and a sell is taken out of them.";
