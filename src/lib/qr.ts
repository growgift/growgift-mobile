import { isValidCodeShape } from "./redemption.ts";

/** QR codes on gift boxes encode the bare code or a link such as growgift://redeem?code=GG-XXXX-XXXX-XXXX. */
export function extractCode(data: string): string | null {
  const m = data.toUpperCase().match(/GG-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/);
  return m && isValidCodeShape(m[0]) ? m[0] : null;
}
