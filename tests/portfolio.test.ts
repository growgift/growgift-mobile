import test from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatShares, holdingValueLabel, portfolioErrorMessage, totalCost } from "../src/lib/portfolio.ts";

test("fractional shares are not rounded away", () => assert.equal(formatShares(0.02029), "0.02029"));
test("unpriced holding says so instead of $0", () =>
  assert.equal(holdingValueLabel({ symbol: "IBM", quantity: 1, marketValue: null, costBasis: 4.61 }), "Price not available"));
test("priced holding shows value", () =>
  assert.equal(holdingValueLabel({ symbol: "IBM", quantity: 1, marketValue: 21, costBasis: 4.61, currency: "USD" }), "US$21.00"));
test("money formatting", () => assert.equal(formatMoney(4.6), "US$4.60"));
test("total cost sums", () =>
  assert.equal(totalCost([{ symbol: "A", quantity: 1, marketValue: null, costBasis: 4.61 }, { symbol: "B", quantity: 1, marketValue: null, costBasis: 1.1 }]), 5.71));
test("api error message passes through, unknown falls back", () => {
  assert.equal(portfolioErrorMessage({ status: 502, message: "We couldn't sign in to ViewTrade to load your portfolio." }), "We couldn't sign in to ViewTrade to load your portfolio.");
  assert.equal(portfolioErrorMessage(new Error("x")), "Couldn't load your portfolio.");
});

import { unlinkedMessage } from "../src/lib/portfolio.ts";
test("unlinked messages follow the backend decision and never claim 'no account' for pending/ambiguous", () => {
  assert.match(unlinkedMessage("pending_review").text, /still processing/);
  assert.doesNotMatch(unlinkedMessage("pending_review").text, /don't have/);
  assert.equal(unlinkedMessage("continue_onboarding").cta?.href, "/kyc");
  assert.equal(unlinkedMessage("start_onboarding").cta?.href, "/redeem");
  assert.match(unlinkedMessage("ambiguous").text, /more than one/);
  assert.ok(unlinkedMessage("something_new").text.length > 0);
});

import { allocationSlices, formatPercent, portfolioTotals, redemptionStateLabel, pnlTone } from "../src/lib/portfolio.ts";
const ibm = { symbol: "IBM", quantity: 0.02029, marketValue: 5.14, costBasis: 4.61, lastPrice: 253.56, changePercent: 0.575, unrealisedPnlPercent: 11.5 };
test("percent formatting is signed and handles missing", () => {
  assert.equal(formatPercent(0.5751), "+0.58%");
  assert.equal(formatPercent(-1.2), "-1.20%");
  assert.equal(formatPercent(null), "—");
  assert.equal(pnlTone(-1), "down");
});
test("totals and P/L only when every holding is priced", () => {
  const t = portfolioTotals([ibm]);
  assert.equal(t.marketValue, 5.14);
  assert.equal(t.pnl, 0.53);
  const u = portfolioTotals([ibm, { symbol: "X", quantity: 1, marketValue: null, costBasis: 1 }]);
  assert.equal(u.marketValue, null);
  assert.equal(u.pnl, null);
});
test("allocation shares sum to 1 and skip unpriced", () => {
  const s = allocationSlices([ibm, { symbol: "A", quantity: 1, marketValue: 4.86, costBasis: 4 }, { symbol: "X", quantity: 1, marketValue: null, costBasis: 1 }]);
  assert.equal(s.length, 2);
  assert.ok(Math.abs(s.reduce((a, b) => a + b.share, 0) - 1) < 1e-9);
  assert.deepEqual(allocationSlices([{ symbol: "X", quantity: 1, marketValue: null, costBasis: 1 }]), []);
});
test("redemption states never call an unconfirmed order retryable text", () => {
  assert.equal(redemptionStateLabel("needs_attention").tone, "bad");
  assert.match(redemptionStateLabel("unconfirmed").text, /check your ViewTrade orders/);
  assert.equal(redemptionStateLabel("filled").tone, "ok");
});

import { describeOrder, openOrderTiming } from "../src/lib/portfolio.ts";
const rblx = { orderRef: "CC31974578", symbol: "RBLX", side: "BUY", orderType: "Notional", currency: "USD", expectedValue: 32.27, quantity: 0.60898, createdUtc: "2026-10-25T06:53:43Z" };
test("dollar orders read as an amount of the stock", () => {
  assert.equal(describeOrder(rblx), "Buy US$32.27 of RBLX");
  assert.equal(describeOrder({ ...rblx, orderType: "Market", expectedValue: null, quantity: 5, side: "SELL" }), "Sell 5 RBLX");
});
test("order timing falls back to the raw text", () => {
  assert.match(openOrderTiming(rblx), /^Placed /);
  assert.equal(openOrderTiming({ ...rblx, createdUtc: null, createdRaw: "10/25/2026 02:53:43 AEDT" }), "Placed 10/25/2026 02:53:43 AEDT");
  assert.equal(openOrderTiming({ ...rblx, createdUtc: null }), "");
});
