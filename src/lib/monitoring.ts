import * as Sentry from "@sentry/react-native";
import { APP_ENV, SENTRY_DSN } from "./config";
import { scrub } from "./scrub";

function scrubEvent<T extends Sentry.ErrorEvent | Sentry.TransactionEvent>(event: T): T {
  delete event.request;
  delete event.user;
  delete event.contexts?.device?.name;
  if (event.message) event.message = scrub(event.message);
  event.exception?.values?.forEach((v) => {
    if (v.value) v.value = scrub(v.value);
  });
  event.breadcrumbs = event.breadcrumbs
    ?.filter((b) => b.category !== "http" && b.category !== "fetch" && b.category !== "xhr")
    .map((b) => ({ ...b, message: b.message ? scrub(b.message) : b.message, data: undefined }));
  return event;
}

let started = false;

export function initMonitoring() {
  if (started || !SENTRY_DSN) return;
  started = true;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    enableAutoSessionTracking: true,
    beforeSend: (e) => scrubEvent(e),
    beforeSendTransaction: (e) => scrubEvent(e),
  });
}

export function reportError(error: unknown) {
  if (SENTRY_DSN) Sentry.captureException(error);
}

export const wrapRoot = Sentry.wrap;
