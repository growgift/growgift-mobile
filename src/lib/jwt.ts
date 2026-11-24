// Reads claims from the access token for UI decisions only. The server re-checks everything.
export type Session = {
  userId: string;
  role: string;
  kycApproved: boolean;
  viewTradeAccount: string | null;
  billingOk: boolean;
  billingPrompt: boolean;
  expiresAt: number | null;
};

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = globalThis.atob(padded);
  // Handle UTF-8 in claims.
  try {
    return decodeURIComponent(bin.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
  } catch {
    return bin;
  }
}

export function parseSession(token: string | null, now = Date.now()): Session | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(b64urlDecode(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < now) return null;
    return {
      userId: payload.sub ?? payload.nameid ?? "",
      role: (payload.role ?? payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? "").toString().toLowerCase(),
      kycApproved: payload.kyc_status === "approved",
      viewTradeAccount: payload.viewtrade_account ?? null,
      billingOk: String(payload.billing_ok ?? "true").toLowerCase() !== "false",
      billingPrompt: String(payload.billing_prompt ?? "false").toLowerCase() === "true",
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    };
  } catch {
    return null;
  }
}
