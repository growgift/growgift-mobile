import assert from "node:assert/strict";
import { test } from "node:test";
import { scrub } from "../src/lib/scrub.ts";

test("removes bearer tokens, emails and gift codes from error text", () => {
  const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2";
  const out = scrub(`failed for a@b.com with ${jwt} and code ABCD-1234-WXYZ`);
  assert.equal(out, "failed for [email] with [token] and code [code]");
});

test("leaves ordinary text alone", () => {
  assert.equal(scrub("Network request failed"), "Network request failed");
});
