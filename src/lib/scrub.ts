// Anything that looks like a bearer token, a gift code or an email never leaves the device.
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const GIFT_CODE = /\b[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,}\b/g;

export function scrub(text: string): string {
  return text.replace(JWT, "[token]").replace(EMAIL, "[email]").replace(GIFT_CODE, "[code]");
}

