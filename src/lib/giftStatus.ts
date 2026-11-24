// Turns the backend's gift-order status into wording a buyer understands. The backend stays the source of truth:
// nothing here decides whether a gift was paid, only how to describe what the server already says. Unknown values
// fail safe to a neutral "being processed" — never to a success message.

export type GiftTone = "good" | "info" | "warn" | "bad";

export type GiftStatusView = {
  label: string;
  tone: GiftTone;
  /** What the buyer should do next, if anything. */
  next?: string;
  /** True once payment is confirmed (so totals, the code and delivery lines may be shown). */
  paid: boolean;
  /** True when a redemption code exists and may be revealed on request. */
  canShowCode: boolean;
};

type OrderLike = { status: string; deliveryMethod?: string; recipientName?: string | null };

const BOX_NAMES: Record<string, string> = { "BOX-CLASSIC": "Classic gift box", "BOX-DELUXE": "Deluxe gift box", "BOX-GRAND": "Grand gift box" };

export function boxName(sku: string | null | undefined): string | null {
  if (!sku) return null;
  return BOX_NAMES[sku] ?? "Gift box";
}

export function describeGiftOrder(o: OrderLike): GiftStatusView {
  const who = o.recipientName?.trim() || "your recipient";
  const physical = o.deliveryMethod === "Physical";
  switch (o.status) {
    case "Draft":
      return { label: "Not paid yet", tone: "warn", next: "Finish checking out from your cart to send this gift.", paid: false, canShowCode: false };
    case "AwaitingPayment":
      return {
        label: "Payment not completed",
        tone: "warn",
        next: "Complete payment from your cart. If you were already charged, refresh in a minute.",
        paid: false,
        canShowCode: false,
      };
    case "Paid":
    case "SharesAcquired":
      return { label: "Payment received — getting your gift ready", tone: "info", paid: true, canShowCode: false };
    case "CodeIssued":
      return {
        label: "Ready to redeem",
        tone: "good",
        next: physical
          ? `Your gift box is being prepared. You can also share the code with ${who} now so they can redeem it.`
          : `We've emailed ${who}. You can also share the code with them yourself.`,
        paid: true,
        canShowCode: true,
      };
    case "Shipped":
      return { label: "On its way — ready to redeem", tone: "good", next: `Share the code with ${who} so they can redeem it.`, paid: true, canShowCode: true };
    case "Redeemed":
      return { label: "Redeemed", tone: "good", paid: true, canShowCode: false };
    case "Expired":
      return { label: "Expired before it was redeemed", tone: "warn", next: "Contact support if you'd like it reissued.", paid: true, canShowCode: false };
    case "Cancelled":
      return { label: "Cancelled", tone: "bad", paid: false, canShowCode: false };
    case "Refunded":
      return { label: "Refunded", tone: "bad", paid: false, canShowCode: false };
    default:
      return { label: "Being processed", tone: "info", paid: false, canShowCode: false };
  }
}

/**
 * Short reference a buyer can quote to support; never the full id and never the redemption code.
 * Deliberately NOT shaped like a redemption code (those are GG-XXXX-XXXX-XXXX), so it can't be mistaken for one.
 */
export function orderRef(id: string): string {
  return `Order ${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export type ShipmentLite = { orderId: string; status: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null };

/** Index a buyer's shipments by order so the profile can show delivery progress next to each physical gift. */
export function shipmentsByOrder(list: ShipmentLite[] | null | undefined): Record<string, ShipmentLite> {
  const out: Record<string, ShipmentLite> = {};
  for (const s of list ?? []) out[s.orderId] = s;
  return out;
}

/** Only ever link to http(s) tracking pages. */
export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type ConfirmationView = {
  headline: string;
  tone: GiftTone;
  /** Only true when the server reports the order paid and a code issued. */
  celebrate: boolean;
};

/**
 * The success message depends on the order status the SERVER returned, never on having landed on the success URL.
 * (The confirmation page asks Stripe via our backend, and reads each order's status, before this is consulted.)
 */
export function confirmationFor(statuses: (string | null)[], paymentCheck: "checking" | "paid" | "unpaid" | "unreachable"): ConfirmationView {
  if (paymentCheck === "unpaid") return { headline: "Payment not completed", tone: "bad", celebrate: false };
  const known = statuses.filter((s): s is string => s !== null);
  const ready = (s: string) => ["CodeIssued", "Shipped", "Redeemed"].includes(s);
  if (statuses.length > 0 && known.length === statuses.length && known.every(ready))
    return { headline: statuses.length > 1 ? "Your gifts are ready! 🎁" : "Your gift is ready! 🎁", tone: "good", celebrate: true };
  if (known.some((s) => s === "AwaitingPayment" || s === "Draft") || known.length < statuses.length)
    return { headline: "Confirming your payment…", tone: "info", celebrate: false };
  return { headline: "Payment confirmed — preparing your gift…", tone: "info", celebrate: false };
}
