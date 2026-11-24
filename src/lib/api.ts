import { API_BASE } from "./config";
import { saveToken } from "./storage";
import type { OrderResult } from "./trading";
import type { SubscriptionView } from "./billing";
import type { OpenOrder, Redemption } from "./portfolio";

// ---- token (held in memory; mirrored to secure storage) ----
let accessToken: string | null = null;
const listeners = new Set<(t: string | null) => void>();

export function getToken(): string | null {
  return accessToken;
}
export async function setToken(token: string | null): Promise<void> {
  accessToken = token;
  await saveToken(token);
  listeners.forEach((l) => l(token));
}
/** Used by the session provider to hydrate from storage without writing back. */
export function hydrateToken(token: string | null): void {
  accessToken = token;
}
export function onTokenChange(fn: (t: string | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const TIMEOUT_MS = 20_000;

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...((init.headers as Record<string, string>) ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await rawFetch(path, init);
  } catch {
    throw new ApiError(0, "network", "We couldn't reach GrowGift. Check your connection and try again.");
  }
  if (res.status === 401) {
    // The token expired or was rejected: sign out so the app returns to the login screen.
    await setToken(null);
    throw new ApiError(401, "unauthorized", "Your session ended. Please sign in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error?.code ?? body?.code ?? "unknown", body?.error?.message ?? body?.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** UUID v4 from Math.random (Hermes has no reliable crypto.randomUUID). Idempotency keys need uniqueness, not secrecy. */
export function newKey(): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}

// ---- types ----
export type DeliveryMethod = "Physical" | "Email";
export type ShippingAddress = {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  phone?: string | null;
};
export type Me = {
  id: string;
  email: string;
  role: string;
  kycStatus: string;
  emailVerified: boolean;
  shippingAddress: ShippingAddress | null;
};
export type GiftOrder = {
  id: string;
  status: string;
  symbol: string;
  amount: { amount: number; currency: string };
  recipientName: string | null;
  deliveryMethod: DeliveryMethod;
  boxSku: string | null;
  totalAmount: number;
};
export type BuyerOrderSummary = {
  id: string;
  symbol: string;
  amount: number;
  currency: string;
  recipientName: string | null;
  status: string;
  hasPhysicalBox: boolean;
  boxSku: string | null;
  deliveryMethod: DeliveryMethod;
  totalAmount: number;
  createdAtUtc: string;
  code: string | null;
};
export type PortfolioView = {
  hasAccount: boolean;
  accountRef?: string;
  cashBalance: number;
  holdings: {
    symbol: string;
    quantity: number;
    marketValue: number | null;
    costBasis: number;
    avgPrice?: number | null;
    currency?: string;
    lastPrice?: number | null;
    changePercent?: number | null;
    unrealisedPnl?: number | null;
    unrealisedPnlPercent?: number | null;
  }[];
  recognised?: boolean;
};
export type ChildRow = {
  id: string;
  name: string;
  dateOfBirth: string;
  loginCode: string | null;
  jars: { shortTerm: number; mediumTerm: number; longTerm: number };
  pendingTasks: { id: string; title: string; reward: number; state: string }[];
};

// ---- endpoints ----
export const api = {
  // auth
  register(input: { email: string; password: string; role: "buyer" | "parent" | "recipient"; shippingAddress?: ShippingAddress }) {
    return request<{ userId: string; message: string; emailSent?: boolean }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
  },
  async login(input: { email: string; password: string }) {
    const r = await request<{ accessToken: string }>("/auth/login", { method: "POST", body: JSON.stringify(input) });
    await setToken(r.accessToken);
    return r;
  },
  async logout() {
    await setToken(null);
  },
  me: () => request<Me>("/auth/me"),
  async refreshSession() {
    const r = await request<{ accessToken: string }>("/auth/me/refresh", { method: "POST" });
    await setToken(r.accessToken);
  },
  async updateShippingAddress(a: ShippingAddress) {
    const r = await request<{ accessToken: string }>("/auth/me/shipping-address", { method: "PUT", body: JSON.stringify(a) });
    if (r?.accessToken) await setToken(r.accessToken);
  },
  async becomeParent() {
    const r = await request<{ accessToken: string }>("/auth/me/become-parent", { method: "POST" });
    await setToken(r.accessToken);
  },

  // gifting
  createGiftOrder(input: {
    symbol: string;
    amount: number;
    currency: string;
    recipientName: string;
    message: string;
    deliveryMethod: DeliveryMethod;
    boxSku?: string;
    recipientEmail?: string;
  }) {
    return request<GiftOrder>("/orders", {
      method: "POST",
      headers: { "Idempotency-Key": newKey() },
      body: JSON.stringify({
        symbol: input.symbol,
        amount: input.amount,
        currency: input.currency,
        recipientName: input.recipientName,
        greetingMessage: input.message || null,
        deliveryMethod: input.deliveryMethod,
        boxSku: input.deliveryMethod === "Physical" ? input.boxSku : null,
        recipientEmail: input.deliveryMethod === "Email" ? input.recipientEmail : null,
      }),
    });
  },
  async createCheckoutSession(orderId: string) {
    const r = await request<{ checkoutUrl: string }>(`/orders/${orderId}/checkout-session`, { method: "POST" });
    return r.checkoutUrl;
  },
  myOrders: () => request<BuyerOrderSummary[]>("/orders"),
  getRevealedCode: (orderId: string) => request<{ status: string; code: string | null }>(`/orders/${orderId}/code`),
  myShipments: () =>
    request<{ orderId: string; status: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null }[]>("/shipments"),
  receivedGifts: () =>
    request<{ giftId: string; orderId: string; symbol: string; amount: number; currency: string; redeemedAtUtc: string }[]>("/gifts/received"),
  previewGift: (code: string) =>
    request<{ symbol: string; amount: number; currency: string; boxSku: string | null; greetingMessage: string | null; recipientName: string; status: string }>(
      "/gifts/preview",
      { method: "POST", body: JSON.stringify({ code }) },
    ),
  redeemGift: (input: { code: string; beneficiaryChildId?: string }) =>
    request<{ giftId: string; symbol: string; amount: number; currency: string }>("/gifts/redeem", {
      method: "POST",
      headers: { "Idempotency-Key": newKey() },
      body: JSON.stringify(input),
    }),
  resolveExistingAccount: () => request<{ decision: string; accountRef?: string | null }>("/onboarding/resolve-existing", { method: "POST" }),

  // brokerage
  portfolio: () => request<PortfolioView>("/portfolio"),
  openOrders: () => request<{ hasAccount: boolean; recognised?: boolean; orders: OpenOrder[] }>("/trading/open-orders"),
  redemptions: () => request<Redemption[]>("/trading/redemptions"),
  tradingStatus: () => request<{ canTrade: boolean; reason: string | null; accountRef: string | null }>("/trading/status"),

  /**
   * Places a buy or sell. Never treats a network drop or an unreadable 5xx as "not placed": the order may have
   * reached the broker, so the answer is "unconfirmed" and the app tells the person to check before trying again.
   */
  async placeOrder(
    input: { side: "BUY" | "SELL"; symbol: string; quantity: number; sellAll?: boolean },
    idempotencyKey: string,
  ): Promise<OrderResult> {
    let res: Response;
    try {
      res = await rawFetch("/trading/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
    } catch {
      return { state: "unconfirmed", message: "We couldn't confirm whether this order went through. Check your orders before trying again." };
    }
    if (res.status === 401) {
      await setToken(null);
      throw new ApiError(401, "unauthorized", "Your session ended. Please sign in again.");
    }
    const body = await res.json().catch(() => ({}));
    if (body && typeof body.state === "string") return body as OrderResult;
    if (res.ok) return { state: "unconfirmed", message: "We couldn't read the brokerage's reply. Check your orders before trying again." };
    const message = body?.message ?? body?.error?.message ?? "We couldn't place this order.";
    if (res.status >= 500 && !body?.code) return { state: "unconfirmed", message: "We couldn't confirm whether this order went through. Check your orders before trying again." };
    throw new ApiError(res.status, body?.code ?? body?.error?.code ?? "unknown", message);
  },

  // subscription (Stripe-hosted pages only)
  subscription: () => request<SubscriptionView>("/billing/subscription"),
  async startSubscriptionCheckout() {
    return (await request<{ url: string }>("/billing/checkout", { method: "POST" })).url;
  },
  async openBillingPortal() {
    return (await request<{ url: string }>("/billing/portal", { method: "POST" })).url;
  },
  async syncSubscription() {
    const r = await request<{ accessToken: string }>("/billing/sync", { method: "POST" });
    await setToken(r.accessToken);
  },

  // family
  listChildren: () => request<ChildRow[]>("/children"),
  createChild: (input: { displayName: string; dateOfBirth: string; pin: string }) =>
    request<{ childId: string; loginCode: string }>("/children", { method: "POST", body: JSON.stringify(input) }),
  createTask: (input: {
    childId: string;
    title: string;
    description?: string;
    rewardAmount: number;
    dueDate: string;
    recurrence: "OneTime" | "Daily" | "Weekly" | "Monthly";
    requiresPhotoProof: boolean;
  }) => request<{ taskId: string }>("/tasks", { method: "POST", body: JSON.stringify(input) }),
  approveTask: (taskId: string) => request<void>(`/tasks/${taskId}/approve`, { method: "POST" }),
  getChildView: () =>
    request<{
      name: string;
      jars: { shortTerm: number; mediumTerm: number; longTerm: number; currency: string };
      pendingTasks: { id: string; title: string; reward: number; state: string }[];
      giftedShares: { symbol: string; amount: number; currency: string; redeemedAtUtc: string }[];
    }>("/me/child-view"),
};
