// API location. A phone cannot reach "localhost" on your computer:
//   iOS simulator:     http://localhost:8080
//   Android emulator:  http://10.0.2.2:8080
//   Physical device:   http://<your-computer-LAN-IP>:8080
// Set EXPO_PUBLIC_API_BASE (gateway, ending in /api/v1) and EXPO_PUBLIC_WEB_BASE (the website) in `.env`.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";
export const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE ?? "http://localhost:3000";

// Crash reporting is off unless a DSN is supplied at build time. The DSN is a public identifier, not a secret.
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";

// Release builds must never talk to the API over plain HTTP.
if (!__DEV__ && !API_BASE.startsWith("https://")) {
  throw new Error("Release builds require an https:// EXPO_PUBLIC_API_BASE");
}
