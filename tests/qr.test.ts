import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCode } from "../src/lib/qr.ts";

test("reads a bare code", () => assert.equal(extractCode("GG-ABCD-1234-WXYZ"), "GG-ABCD-1234-WXYZ"));
test("reads a code from a deep link, any case", () =>
  assert.equal(extractCode("growgift://redeem?code=gg-abcd-1234-wxyz"), "GG-ABCD-1234-WXYZ"));
test("reads a code from the website link", () =>
  assert.equal(extractCode("https://growgift.com.au/redeem?code=GG-ABCD-1234-WXYZ"), "GG-ABCD-1234-WXYZ"));
test("ignores anything that is not a code", () => {
  assert.equal(extractCode("https://example.com"), null);
  assert.equal(extractCode("GG-ABC-1234-WXYZ"), null);
  assert.equal(extractCode(""), null);
});
