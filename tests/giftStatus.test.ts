import { test } from "node:test";
import assert from "node:assert/strict";
import { describeGiftOrder, orderRef, safeTrackingUrl, shipmentsByOrder, confirmationFor, boxName } from "../src/lib/giftStatus.ts";

test("an unpaid order never reads as a successful purchase", () => {
  for (const status of ["Draft", "AwaitingPayment"]) {
    const v = describeGiftOrder({ status });
    assert.equal(v.paid, false);
    assert.equal(v.canShowCode, false);
    assert.notEqual(v.tone, "good");
    assert.ok(v.next);
  }
});

test("a paid order is never shown as Payment pending", () => {
  for (const status of ["Paid", "SharesAcquired", "CodeIssued", "Shipped", "Redeemed"]) {
    const v = describeGiftOrder({ status });
    assert.equal(v.paid, true);
    assert.ok(!/not completed|not paid/i.test(v.label));
  }
});

test("a gift awaiting redemption is not described as completed, and a redeemed one is", () => {
  assert.ok(!/redeemed$/i.test(describeGiftOrder({ status: "CodeIssued" }).label));
  assert.equal(describeGiftOrder({ status: "Redeemed" }).label, "Redeemed");
  assert.equal(describeGiftOrder({ status: "Redeemed" }).canShowCode, false);
});

test("the code can only be revealed while it is redeemable", () => {
  assert.equal(describeGiftOrder({ status: "CodeIssued" }).canShowCode, true);
  assert.equal(describeGiftOrder({ status: "Shipped" }).canShowCode, true);
  for (const s of ["Draft", "AwaitingPayment", "Paid", "Expired", "Cancelled", "Refunded"])
    assert.equal(describeGiftOrder({ status: s }).canShowCode, false, s);
});

test("labels are friendly, never raw enum names, and unknown values fail safe", () => {
  for (const s of ["Draft", "AwaitingPayment", "Paid", "SharesAcquired", "CodeIssued", "Shipped", "Redeemed", "Expired", "Cancelled", "Refunded"])
    assert.ok(describeGiftOrder({ status: s }).label.includes(" ") || s === "Redeemed" || s === "Cancelled" || s === "Refunded", s);
  const u = describeGiftOrder({ status: "SomethingNew" });
  assert.equal(u.paid, false);
  assert.equal(u.tone, "info");
});

test("next-step wording differs for physical and email gifts and names the recipient", () => {
  const p = describeGiftOrder({ status: "CodeIssued", deliveryMethod: "Physical", recipientName: "Mia" });
  const e = describeGiftOrder({ status: "CodeIssued", deliveryMethod: "Email", recipientName: "Mia" });
  assert.match(p.next!, /gift box/);
  assert.match(e.next!, /emailed Mia/);
});

test("order reference is short and cannot be mistaken for a redemption code", () => {
  const ref = orderRef("3f2b9c1e-aaaa-bbbb-cccc-1234567890ab");
  assert.equal(ref, "Order 3F2B9C1E");
  assert.ok(!/^GG-/.test(ref));
});

test("box names", () => {
  assert.equal(boxName("BOX-DELUXE"), "Deluxe gift box");
  assert.equal(boxName(null), null);
  assert.equal(boxName("BOX-NEW"), "Gift box");
});

test("tracking links must be http(s)", () => {
  assert.equal(safeTrackingUrl("javascript:alert(1)"), null);
  assert.equal(safeTrackingUrl("not a url"), null);
  assert.equal(safeTrackingUrl(null), null);
  assert.equal(safeTrackingUrl("https://example.com/t/1"), "https://example.com/t/1");
});

test("shipments are indexed by order", () => {
  const m = shipmentsByOrder([{ orderId: "a", status: "On its way" }, { orderId: "b", status: "Delivered" }]);
  assert.equal(m.a.status, "On its way");
  assert.deepEqual(shipmentsByOrder(null), {});
});

test("confirmation celebrates only when the server says the code is issued", () => {
  assert.equal(confirmationFor(["CodeIssued"], "paid").celebrate, true);
  assert.equal(confirmationFor([], "checking").celebrate, false);
  assert.equal(confirmationFor([null], "checking").celebrate, false);
  assert.equal(confirmationFor(["AwaitingPayment"], "paid").celebrate, false);
  assert.equal(confirmationFor(["Paid"], "paid").celebrate, false);
  assert.equal(confirmationFor(["CodeIssued", "Paid"], "paid").celebrate, false);
  assert.equal(confirmationFor(["CodeIssued"], "unpaid").celebrate, false);
  assert.equal(confirmationFor(["CodeIssued"], "unpaid").headline, "Payment not completed");
  assert.equal(confirmationFor(["CodeIssued", "Shipped"], "paid").headline, "Your gifts are ready! 🎁");
});
