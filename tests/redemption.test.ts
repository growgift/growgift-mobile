import { test } from "node:test";
import assert from "node:assert/strict";
import {
  savePending, loadPending, clearPending, hasPending, PENDING_KEY, PENDING_TTL_MS, type KV,
} from "../src/lib/redemption.ts";

function memStore(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
const CODE = "GG-84KQ-29MN-XP8D";

test("restores the code after a login/signup round trip", () => {
  const s = memStore();
  assert.equal(savePending(CODE, s, 1000), true);
  assert.deepEqual(loadPending(s, 2000), { code: CODE, createdAt: 1000 });
  assert.equal(hasPending(s, 2000), true);
});

test("survives a refresh (same store) and is cleared once redeemed/logged out", () => {
  const s = memStore();
  savePending(CODE, s, 0);
  assert.ok(loadPending(s, 10));
  assert.ok(loadPending(s, 20)); // reading doesn't consume it
  clearPending(s);
  assert.equal(loadPending(s, 30), null);
});

test("expires after 30 minutes and is cleaned up", () => {
  const s = memStore();
  savePending(CODE, s, 0);
  assert.ok(loadPending(s, PENDING_TTL_MS));
  assert.equal(loadPending(s, PENDING_TTL_MS + 1), null);
  assert.equal(s.data.has(PENDING_KEY), false);
});

test("rejects malformed / tampered / implausible state", () => {
  const s = memStore();
  assert.equal(savePending("not-a-code", s), false);
  assert.equal(savePending("GG-84KQ-29MN-XP8D<script>", s), false);
  for (const junk of ["{", "null", "[]", '{"code":1}', '{"code":"GG-84KQ-29MN-XP8D"}',
    JSON.stringify({ code: "bad", createdAt: 5 }),
    JSON.stringify({ code: CODE, createdAt: 10_000_000_000_000 })]) {
    s.setItem(PENDING_KEY, junk);
    assert.equal(loadPending(s, 100), null, junk);
    assert.equal(s.data.has(PENDING_KEY), false, "junk is removed: " + junk);
  }
});

test("degrades gracefully when storage is unavailable or throws", () => {
  assert.equal(savePending(CODE, null), false);
  assert.equal(loadPending(null), null);
  const throwing: KV = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("quota"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  assert.equal(savePending(CODE, throwing), false);
  assert.equal(loadPending(throwing), null);
  assert.doesNotThrow(() => clearPending(throwing));
});

test("only the code is stored — no role, family id or tokens", () => {
  const s = memStore();
  savePending(CODE, s, 5);
  assert.deepEqual(Object.keys(JSON.parse(s.data.get(PENDING_KEY)!)).sort(), ["code", "createdAt"]);
});
