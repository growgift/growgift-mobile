import { test } from "node:test";
import assert from "node:assert/strict";
import { actionFor, waitForApproval, STATUS_UNAVAILABLE, needsBrokerageCheck } from "../src/lib/brokerageGate.ts";

test("only an existing, approved account skips onboarding", () => {
  assert.deepEqual(actionFor("skip_onboarding"), { kind: "proceed" });
});

test("new users and users with incomplete onboarding keep the existing onboarding flow", () => {
  assert.deepEqual(actionFor("start_onboarding"), { kind: "onboard" });
  assert.deepEqual(actionFor("continue_onboarding"), { kind: "onboard" });
});

test("pending review, ineligible, ambiguous and unverified email STOP — none of them onboard or proceed", () => {
  for (const d of ["pending_review", "not_eligible", "ambiguous", "email_unverified"]) {
    const a = actionFor(d);
    assert.equal(a.kind, "stop", d);
    assert.ok(a.kind === "stop" && /gift is saved/i.test(a.message), `${d} reassures the gift is kept`);
  }
  assert.equal((actionFor("pending_review") as { retryable: boolean }).retryable, true);
  assert.equal((actionFor("ambiguous") as { retryable: boolean }).retryable, false);
});

test("an unknown or malformed decision fails safe: stop with retry, never onboard or proceed", () => {
  for (const d of ["", "weird", "SKIP_ONBOARDING", "undefined"]) {
    const a = actionFor(d);
    assert.equal(a.kind, "stop", d);
    assert.equal(a.kind === "stop" && a.retryable, true);
  }
});

test("a failed status check is a retryable stop that says nothing was changed", () => {
  assert.equal(STATUS_UNAVAILABLE.retryable, true);
  assert.match(STATUS_UNAVAILABLE.message, /nothing has been changed/i);
});

test("waitForApproval returns as soon as the refreshed token is approved", async () => {
  let n = 0;
  const slept: number[] = [];
  const ok = await waitForApproval(async () => ++n === 3, { attempts: 8, delayMs: 5, sleep: async (ms) => void slept.push(ms) });
  assert.equal(ok, true);
  assert.equal(n, 3);
  assert.equal(slept.length, 2);
});

test("waitForApproval gives up after the attempt limit and survives transient refresh errors", async () => {
  let n = 0;
  const ok = await waitForApproval(async () => { n++; throw new Error("network"); }, { attempts: 4, delayMs: 1, sleep: async () => {} });
  assert.equal(ok, false);
  assert.equal(n, 4);
});

test("a dev-simulated 'approved' account still needs the brokerage check; a real one does not", () => {
  assert.equal(needsBrokerageCheck({ kycApproved: false, viewTradeAccount: null }), true);
  assert.equal(needsBrokerageCheck({ kycApproved: true, viewTradeAccount: "VT-DEV-417EA9D0" }), true);
  assert.equal(needsBrokerageCheck({ kycApproved: true, viewTradeAccount: "ORBS-01-004099" }), false);
  assert.equal(needsBrokerageCheck({ kycApproved: true, viewTradeAccount: null }), false);
});
