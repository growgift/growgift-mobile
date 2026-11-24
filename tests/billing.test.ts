import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSkipSubscribe, cardRuleNote, checkoutErrorMessage, describeSubscription, formatDate, formatPrice, isSubscriptionError,
  planSummary, postLoginDestination, type SubscriptionView,
} from "../src/lib/billing.ts";

const base: SubscriptionView = {
  required: true, enforced: true, status: "none", entitled: false, billingOk: false, trialEligible: true,
  trialMonths: 3, minCardMonths: 6, trialEndsAt: null, cancelAtPeriodEnd: false,
  price: { amount: 3, currency: "aud", interval: "month" }, available: true,
};

test("the price is shown from Stripe's numbers, not hard-coded", () => {
  assert.match(formatPrice({ amount: 3, currency: "aud", interval: "month" })!, /3\.00 AUD a month$/);
  assert.match(formatPrice({ amount: 4.5, currency: "AUD", interval: "month" })!, /4\.50 AUD a month$/);
  assert.equal(formatPrice(null), null);
});

test("the plan sentence says 3 months free then the price, and drops the trial when not eligible", () => {
  assert.match(planSummary(base), /^3 months free, then .*3\.00 AUD a month\. Cancel any time\.$/);
  const dated = { ...base, freeUntil: "2027-02-07T03:00:00Z" };
  const nov = Date.parse("2026-11-08T00:00:00Z");
  assert.match(planSummary(dated, nov), /^Free until 7 February 2027, then .*3\.00 AUD a month\./);
  assert.doesNotMatch(planSummary(dated, Date.parse("2027-03-01T00:00:00Z")), /Free until/);
  assert.doesNotMatch(planSummary({ ...base, trialEligible: false }), /free/);
  assert.match(planSummary({ ...base, trialMonths: 1 }), /^1 month free/);
  assert.match(planSummary({ ...base, price: null }), /standard monthly price/);
});

test("the card rule is stated up front", () => {
  assert.match(cardRuleNote(6), /at least 6 months/);
  assert.match(cardRuleNote(0), /card is needed/);
});

test("a free trial reads as good and offers Manage; the end date is shown in UTC", () => {
  const d = describeSubscription({ ...base, status: "trialing", entitled: true, billingOk: true, trialEndsAt: "2027-02-07T03:00:00Z" });
  assert.equal(d.tone, "good");
  assert.equal(d.action, "manage");
  assert.match(d.detail, /7 February 2027/);
  assert.equal(formatDate("not a date"), null);
});

test("lapsed, rejected and never-started each point to subscribing, and reassure", () => {
  for (const status of ["canceled", "unpaid", "incomplete_expired"]) {
    const d = describeSubscription({ ...base, status });
    assert.equal(d.action, "subscribe");
    assert.match(d.detail, /safe/);
  }
  const r = describeSubscription({ ...base, status: "card_rejected" });
  assert.equal(r.tone, "bad");
  assert.match(r.detail, /at least 6 months/);
  assert.equal(describeSubscription({ ...base, status: "none" }).action, "subscribe");
});

test("past due keeps the account usable but asks for a new card", () => {
  const d = describeSubscription({ ...base, status: "past_due", entitled: true, billingOk: true });
  assert.equal(d.tone, "warn");
  assert.equal(d.action, "manage");
});

test("accounts that don't need a subscription are told so and offered nothing", () => {
  const d = describeSubscription({ ...base, required: false });
  assert.equal(d.action, "none");
});

test("unknown statuses fail safe to a neutral message, never to 'subscribed'", () => {
  const d = describeSubscription({ ...base, status: "brand_new_status" });
  assert.notEqual(d.tone, "good");
  assert.notEqual(d.headline, "Subscribed");
});

test("inside the free period a card invitation shows once per browser session; blocked accounts always go", () => {
  assert.equal(postLoginDestination(true, "/family", { billingPrompt: true }), "/subscribe?then=%2Ffamily");
  assert.equal(postLoginDestination(true, "/family", { billingPrompt: true, alreadyPrompted: true }), "/family");
  assert.equal(postLoginDestination(false, "/family", { billingPrompt: true, alreadyPrompted: true }), "/subscribe?then=%2Ffamily");
  assert.equal(postLoginDestination(true, "/family", { billingPrompt: false }), "/family");
});

test("someone still in their free period is told when it ends and invited to add a card", () => {
  const d = describeSubscription({ ...base, billingOk: true, freeUntil: "2027-02-07T03:00:00Z" });
  assert.equal(d.tone, "info");
  assert.match(d.headline, /^Free until 7 February 2027$/);
  assert.equal(d.action, "subscribe");
  const ended = describeSubscription({ ...base, billingOk: false, freeUntil: "2026-10-01T00:00:00Z" });
  assert.equal(ended.headline, "Your free period has ended");
  assert.equal(ended.tone, "warn");
});

test("a new account must add its card: no skip link, and the first payment date is shown", () => {
  const v = { ...base, cardRequired: true, billingOk: false, freeUntil: "2027-02-07T03:00:00Z" };
  const d = describeSubscription(v);
  assert.equal(d.headline, "Add your card to finish signing up");
  assert.match(d.detail, /Nothing is charged now.*7 February 2027, 3 months after you registered/);
  assert.equal(canSkipSubscribe(v), false);
  assert.equal(canSkipSubscribe({ ...base, cardRequired: false }), true);
  assert.equal(canSkipSubscribe({ ...base }), true);
});

test("after sign-in only an explicit billingOk=false is diverted to subscribe, keeping the destination", () => {
  assert.equal(postLoginDestination(true, "/family"), "/family");
  assert.equal(postLoginDestination(undefined, "/family"), "/family");
  assert.equal(postLoginDestination(false, "/redeem?resume=1"), "/subscribe?then=%2Fredeem%3Fresume%3D1");
});

test("a 402 or the subscription code is recognised as a billing problem", () => {
  assert.equal(isSubscriptionError({ status: 402, code: "x" }), true);
  assert.equal(isSubscriptionError({ status: 400, code: "subscription.required" }), true);
  assert.equal(isSubscriptionError({ status: 400, code: "other" }), false);
  assert.equal(isSubscriptionError(null), false);
  assert.equal(isSubscriptionError(new Error("x")), false);
});

test("checkout errors map to friendly text and never expose a raw code", () => {
  assert.match(checkoutErrorMessage("subscription.already_active"), /already have a subscription/);
  assert.match(checkoutErrorMessage("billing.not_configured"), /aren't available/);
  assert.match(checkoutErrorMessage(undefined), /try again/);
  assert.doesNotMatch(checkoutErrorMessage("billing.stripe_error"), /billing\./);
});
