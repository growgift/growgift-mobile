// Wording and small decisions for the subscription pages. Dependency-free so it can be unit-tested with plain Node.
// Nothing here decides who may do what: the server (Identity) decides and puts it in the token and the status
// response. These helpers only describe what the server said, and fail safe on anything unfamiliar.

export type PlanPrice = { amount: number; currency: string; interval: string | null } | null;

export type SubscriptionView = {
  required: boolean;
  enforced: boolean;
  status: string;
  entitled: boolean;
  billingOk: boolean;
  trialEligible: boolean;
  trialMonths: number;
  minCardMonths: number;
  trialEndsAt: string | null;
  /** End of this person's free period (3 months from registration), when enforcement is on for their role. */
  freeUntil?: string | null;
  /** True for accounts registered after billing began: adding a card is part of finishing registration. */
  cardRequired?: boolean;
  cancelAtPeriodEnd: boolean;
  price: PlanPrice;
  available: boolean;
};

export type SubscriptionTone = "good" | "info" | "warn" | "bad";
export type SubscriptionAction = "subscribe" | "manage" | "none";

export function formatPrice(price: PlanPrice): string | null {
  if (!price) return null;
  const currency = (price.currency || "AUD").toUpperCase();
  let amount: string;
  try {
    amount = new Intl.NumberFormat("en-AU", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(price.amount);
  } catch {
    amount = price.amount.toFixed(2);
  }
  const per = price.interval === "month" ? " a month" : price.interval === "year" ? " a year" : "";
  return `${amount} ${currency}${per}`;
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "3 months free, then $3.00 AUD a month." — the sentence shown before anyone enters a card. */
export function planSummary(v: Pick<SubscriptionView, "trialEligible" | "trialMonths" | "price"> & { freeUntil?: string | null }, nowMs: number = Date.now()): string {
  const price = formatPrice(v.price);
  const then = price ? `${price}` : "the standard monthly price";
  const until = formatDate(v.freeUntil);
  if (v.trialEligible && until && new Date(v.freeUntil as string).getTime() > nowMs) {
    return `Free until ${until}, then ${then}. Cancel any time.`;
  }
  if (v.trialEligible && v.trialMonths > 0) {
    return `${v.trialMonths} ${v.trialMonths === 1 ? "month" : "months"} free, then ${then}. Cancel any time.`;
  }
  return `${then}. Cancel any time.`;
}

/** Registration is not finished until the card is on file, so there is no "Not now" for those accounts. */
export function canSkipSubscribe(v: Pick<SubscriptionView, "cardRequired">): boolean {
  return v.cardRequired !== true;
}

export function cardRuleNote(minCardMonths: number): string {
  if (minCardMonths <= 0) return "A card is needed to start, even during the free period.";
  return `A card is needed to start, even during the free period. It must stay valid for at least ${minCardMonths} months from today, so a card that expires sooner can't be used.`;
}

export function describeSubscription(v: SubscriptionView): { headline: string; detail: string; tone: SubscriptionTone; action: SubscriptionAction } {
  if (!v.required) {
    return { headline: "No subscription needed", detail: "Your account type doesn't need a subscription.", tone: "info", action: "none" };
  }
  const trialEnd = formatDate(v.trialEndsAt);
  switch (v.status) {
    case "trialing":
      return {
        headline: "Free trial",
        detail: trialEnd ? `Your free period runs until ${trialEnd}. You'll only be charged after that.` : "You're in your free period.",
        tone: "good",
        action: "manage",
      };
    case "active":
      return {
        headline: v.cancelAtPeriodEnd ? "Ends at the close of this period" : "Subscribed",
        detail: v.cancelAtPeriodEnd ? "You've cancelled; you keep full access until the period you've paid for ends." : "Thanks for subscribing.",
        tone: v.cancelAtPeriodEnd ? "warn" : "good",
        action: "manage",
      };
    case "past_due":
      return {
        headline: "Payment didn't go through",
        detail: "We'll try again shortly. Update your card to be sure you keep full access.",
        tone: "warn",
        action: "manage",
      };
    case "card_rejected":
      return {
        headline: "That card can't be used",
        detail: `The card expires too soon. Please use one that stays valid for at least ${v.minCardMonths} months.`,
        tone: "bad",
        action: "subscribe",
      };
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return {
        headline: "Subscription ended",
        detail: "Your account, gifts and investments are safe. Subscribe again to buy new gifts and add to your family.",
        tone: "warn",
        action: "subscribe",
      };
    case "none": {
      const until = formatDate(v.freeUntil);
      if (v.cardRequired) {
        return {
          headline: "Add your card to finish signing up",
          detail: until
            ? `Nothing is charged now. Your first payment is on ${until}, 3 months after you registered.`
            : "Nothing is charged now. Your first payment comes after your free months.",
          tone: "warn",
          action: "subscribe",
        };
      }
      if (v.billingOk) {
        return {
          headline: until ? `Free until ${until}` : "Subscription not started",
          detail: until
            ? "Add a card before then and your subscription starts the day your free period ends, with no gap. You can do it now."
            : "You can subscribe any time.",
          tone: "info",
          action: "subscribe",
        };
      }
      return {
        headline: "Your free period has ended",
        detail: "Add a card to carry on buying gifts and adding to your family. You can still sign in, redeem gifts and sell either way.",
        tone: "warn",
        action: "subscribe",
      };
    }
    default:
      return { headline: "Checking your subscription", detail: "We're confirming the latest status with our payment provider.", tone: "info", action: "subscribe" };
  }
}

/** After sign-in: anyone the server says must sort out billing goes to the subscribe page first, then on to where they were headed. */
export function postLoginDestination(
  billingOk: boolean | undefined,
  destination: string,
  prompt: { billingPrompt?: boolean; alreadyPrompted?: boolean } = {},
): string {
  // Blocked: always. Still inside the free period: a gentle invitation to add a card, once per browser session.
  const send = billingOk === false || (prompt.billingPrompt === true && prompt.alreadyPrompted !== true);
  return send ? `/subscribe?then=${encodeURIComponent(destination)}` : destination;
}

/** True when an API error means "subscription needed" (HTTP 402 or its code). */
export function isSubscriptionError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { status?: unknown; code?: unknown };
  return err.status === 402 || err.code === "subscription.required";
}

export function checkoutErrorMessage(code: string | undefined): string {
  switch (code) {
    case "subscription.already_active":
      return "You already have a subscription. Use Manage subscription to change it.";
    case "subscription.not_required":
      return "Your account type doesn't need a subscription.";
    case "billing.not_configured":
      return "Subscriptions aren't available just yet. Please try again soon.";
    default:
      return "We couldn't start checkout just now. Please try again.";
  }
}
