// Pure decision + polling helpers for "does this recipient still need broker
// onboarding?". The BACKEND makes the real decision (it alone may look at
// ViewTrade, using the caller's verified e-mail); this file only maps the
// backend's answer to what the page does next, so the mapping can be tested
// without React or the network. Unknown values deliberately fail SAFE: stop
// and ask the user to retry — never "go and start a new application".

export type BrokerageDecision =
  | "start_onboarding"
  | "continue_onboarding"
  | "skip_onboarding"
  | "pending_review"
  | "not_eligible"
  | "ambiguous"
  | "email_unverified";

export type GateAction =
  | { kind: "onboard" }
  | { kind: "proceed" }
  | { kind: "stop"; title: string; message: string; retryable: boolean };

export function actionFor(decision: string): GateAction {
  switch (decision as BrokerageDecision) {
    case "start_onboarding":
    case "continue_onboarding":
      return { kind: "onboard" };
    case "skip_onboarding":
      return { kind: "proceed" };
    case "pending_review":
      return {
        kind: "stop",
        title: "Your brokerage account is being reviewed",
        message:
          "ViewTrade is still reviewing your application. Your gift is saved — come back to redeem it once the review is finished.",
        retryable: true,
      };
    case "email_unverified":
      return {
        kind: "stop",
        title: "Verify your email first",
        message:
          "Before we look for an existing brokerage account, please verify your email address using the link we sent you. Your gift is saved.",
        retryable: true,
      };
    case "not_eligible":
      return {
        kind: "stop",
        title: "We can't use your existing brokerage account",
        message:
          "ViewTrade reports this account isn't able to receive shares right now. Your gift is saved — please contact support.",
        retryable: false,
      };
    case "ambiguous":
      return {
        kind: "stop",
        title: "We couldn't safely match your account",
        message:
          "We found more than one possible brokerage record for your email, so we haven't picked one. Your gift is saved — please contact support.",
        retryable: false,
      };
    default:
      return {
        kind: "stop",
        title: "We couldn't check your brokerage status",
        message: "Something unexpected came back. Your gift is saved — please try again.",
        retryable: true,
      };
  }
}

export const STATUS_UNAVAILABLE: Extract<GateAction, { kind: "stop" }> = {
  kind: "stop",
  title: "We couldn't check your brokerage status",
  message:
    "We couldn't reach our brokerage partner just now. Nothing has been changed and your gift is saved — please try again.",
  retryable: true,
};

/**
 * After an existing account is linked, Identity learns about it asynchronously
 * (an event), so the browser's token may lag a moment. Re-issues the token and
 * checks it a few times; returns true as soon as it carries KYC approval.
 */
export async function waitForApproval(
  refreshAndCheck: () => Promise<boolean>,
  opts: { attempts?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  const attempts = opts.attempts ?? 8;
  const delayMs = opts.delayMs ?? 1000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let i = 0; i < attempts; i++) {
    try {
      if (await refreshAndCheck()) return true;
    } catch {
      // a transient refresh failure just means "not yet"
    }
    if (i < attempts - 1) await sleep(delayMs);
  }
  return false;
}

/** The Development-only "Simulate verification" shortcut hands out account numbers with this prefix. */
export const SIMULATED_ACCOUNT_PREFIX = "VT-DEV-";

/**
 * True when the session still needs the brokerage check: not KYC-approved, OR "approved" only through the
 * dev simulation (a fake account that doesn't exist at ViewTrade, so nothing could ever be bought into it).
 */
export function needsBrokerageCheck(s: { kycApproved: boolean; viewTradeAccount: string | null }): boolean {
  return !s.kycApproved || (s.viewTradeAccount ?? "").startsWith(SIMULATED_ACCOUNT_PREFIX);
}
