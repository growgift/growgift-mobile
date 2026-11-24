import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderForm, describeState, newIdempotencyKey, ineligibleMessage } from "../src/lib/trading.ts";

test("valid buy is normalised", () => {
  const r = validateOrderForm({ side: "BUY", symbol: " aapl ", quantity: "5" });
  assert.deepEqual(r, { ok: true, symbol: "AAPL", quantity: 5 });
});

test("rejects bad symbols and quantities", () => {
  for (const [symbol, quantity] of [["", "1"], ["A A", "1"], ["AAPL;", "1"], ["AAPL", "0"], ["AAPL", "-1"], ["AAPL", "1.5"], ["AAPL", "abc"], ["AAPL", "10001"], ["AAPL", ""]])
    assert.equal(validateOrderForm({ side: "BUY", symbol, quantity }).ok, false, `${symbol}/${quantity}`);
});

test("sell is checked against known holdings, but only as a hint", () => {
  const held = [{ symbol: "IBM", quantity: 3 }];
  assert.equal(validateOrderForm({ side: "SELL", symbol: "IBM", quantity: "3" }, held).ok, true);
  assert.equal(validateOrderForm({ side: "SELL", symbol: "IBM", quantity: "4" }, held).ok, false);
  assert.equal(validateOrderForm({ side: "SELL", symbol: "TSLA", quantity: "1" }, held).ok, false);
  // No holdings data → don't block; the broker is the authority.
  assert.equal(validateOrderForm({ side: "SELL", symbol: "TSLA", quantity: "1" }, []).ok, true);
  assert.equal(validateOrderForm({ side: "SELL", symbol: "TSLA", quantity: "1" }).ok, true);
});

test("idempotency keys are unique and satisfy the backend's 8-64 [A-Za-z0-9_-] rule", () => {
  const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
  assert.equal(keys.size, 50);
  for (const k of keys) assert.match(k, /^[A-Za-z0-9_-]{8,64}$/);
});

test("only 'filled' is described as complete; accepted is explicitly not executed", () => {
  assert.equal(describeState("filled").tone, "good");
  assert.match(describeState("accepted").title, /not yet executed/i);
  for (const s of ["accepted", "pending", "partiallyfilled", "unconfirmed"] as const) assert.equal(describeState(s).final, false, s);
  assert.equal(describeState("rejected").tone, "bad");
  assert.equal(describeState("failed").tone, "bad");
  assert.match(describeState("unconfirmed").title, /couldn't confirm/i);
});

test("ineligible reasons point somewhere useful", () => {
  assert.equal(ineligibleMessage("kyc_required").href, "/kyc");
  assert.equal(ineligibleMessage("no_account").href, "/redeem");
  assert.equal(ineligibleMessage("child_account").href, undefined);
});

// ---- selling from My Profile ----
import { checkSell, quantityForFraction, estimateProceeds, formatQty, sellUnavailableReason } from "../src/lib/trading.ts";

test("sell: fractional quantities are valid on the sell form (gifted holdings are fractional)", () => {
  assert.deepEqual(validateOrderForm({ side: "SELL", symbol: "ibm", quantity: "0.02029" }, [{ symbol: "IBM", quantity: 0.02029 }]), { ok: true, symbol: "IBM", quantity: 0.02029 });
  assert.equal(validateOrderForm({ side: "SELL", symbol: "IBM", quantity: "0.1234567" }).ok, false);
  assert.equal(validateOrderForm({ side: "SELL", symbol: "IBM", quantity: ".5" }).ok, true);
  assert.equal(validateOrderForm({ side: "SELL", symbol: "IBM", quantity: "5." }).ok, false);
  // buying by quantity is still whole shares only
  assert.equal(validateOrderForm({ side: "BUY", symbol: "IBM", quantity: "0.5" }).ok, false);
});

test("checkSell: 'all' sells the whole position and sends no typed number", () => {
  assert.deepEqual(checkSell(0.02029, "all", "junk"), { ok: true, quantity: 0.02029, sellAll: true });
});

test("checkSell: partial amounts", () => {
  assert.deepEqual(checkSell(0.02029, "part", "0.01"), { ok: true, quantity: 0.01, sellAll: false });
  for (const bad of ["", "  ", "abc", "-1", "0", "0.0", "1e3", "0.1234567", "0.03"])
    assert.equal(checkSell(0.02029, "part", bad).ok, false, `"${bad}"`);
  assert.match((checkSell(0.02029, "part", "0.03") as { message: string }).message, /only hold 0\.02029/);
});

test("checkSell: entering the whole position (or a hair under) becomes sell-all so no dust is left", () => {
  assert.deepEqual(checkSell(0.02029, "part", "0.02029"), { ok: true, quantity: 0.02029, sellAll: true });
  assert.deepEqual(checkSell(0.02029, "part", "0.0202895"), { ok: false, message: "Enter a number with at most 6 decimal places." });
  assert.equal((checkSell(0.02029, "part", "0.020289") as { sellAll: boolean }).sellAll, true);
});

test("checkSell: nothing held, nothing to sell", () => {
  assert.equal(checkSell(0, "all", "").ok, false);
  assert.equal(checkSell(0, "part", "1").ok, false);
});

test("quick-amount buttons never exceed the position and keep the sell precision", () => {
  for (const held of [0.02029, 1, 3.333333, 100, 0.000003]) for (const f of [0.25, 0.5, 0.75]) {
    const q = quantityForFraction(held, f);
    assert.ok(q <= held * f + 1e-12, `${held}*${f}`);
    assert.ok(q <= held);
    assert.ok(Math.abs(q * 1e6 - Math.round(q * 1e6)) < 1e-6, "at most 6 decimals");
  }
  assert.equal(quantityForFraction(0.02029, 0.5), 0.010145);
});

test("estimateProceeds / formatQty", () => {
  assert.equal(estimateProceeds(0.02029, 253.56), 5.14);
  assert.equal(estimateProceeds(1, null), null);
  assert.equal(estimateProceeds(1, 0), null);
  assert.equal(formatQty(0.02029), "0.02029");
  assert.equal(formatQty(1234.5), "1,234.5");
});

test("sell availability follows eligibility", () => {
  assert.equal(sellUnavailableReason(true, null), null);
  assert.match(sellUnavailableReason(false, "child_account")!, /Child logins/);
  assert.match(sellUnavailableReason(false, "kyc_required")!, /identity verification/i);
  assert.match(sellUnavailableReason(null, null)!, /Checking/);
});
