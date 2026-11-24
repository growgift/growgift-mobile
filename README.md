# GrowGift Mobile

One React Native (Expo) app for **iOS and Android** that talks to the GrowGift gateway (`growgift-core`). Give a share, grow a future.

## What is in the app

| Area | Screens | Notes |
|---|---|---|
| Account | Welcome, Sign in, Create account | Buyer, recipient or family sign-up; child logins use code + PIN |
| Give | Collections, Gift builder | Email or gift-box delivery; payment on Stripe's hosted page (card, Apple Pay, Google Pay); card details never touch the app |
| My gifts | Orders, status, reveal and share code, parcel tracking, pay now | Wording shared with the website |
| Redeem | QR scan or typed code, preview, redeem | Existing ViewTrade accounts are detected; new identity applications open the website form |
| Portfolio | Holdings, open orders, gift purchases | |
| Trade | Buy, sell, sell everything | One idempotency key per attempt; "unconfirmed" is never shown as "failed" |
| Family | Children, jars, chores, approve | Parents only |
| Child | Jars, chores, gifts | Read-only |
| Subscription | Add card, manage | Stripe-hosted pages |

**Not in v1 (opens the website instead):** the long ViewTrade identity application, editing the shipping address, push notifications.

## Security

- The access token is stored only in the iOS Keychain / Android Keystore (`expo-secure-store`).
- No API keys or secrets are in the app. Only public settings (`EXPO_PUBLIC_*`) are bundled.
- All Stripe, ViewTrade and Shippit calls happen on the server. The app never sees a ViewTrade token.
- Redemption codes are only shown on request and are not logged.
- Use HTTPS API addresses for any build other than local development.

## Run it locally

1. Start the backend (see `growgift-core`, *Local Setup Guide*).
2. Install: `npm install --legacy-peer-deps` (Node 22).
3. Copy `.env.example` to `.env` and set the API address for where you are running:
   - iOS simulator `http://localhost:8080/api/v1`
   - Android emulator `http://10.0.2.2:8080/api/v1`
   - Physical phone `http://<your-computer-LAN-IP>:8080/api/v1`
4. `npx expo start`, then press `i` (iOS simulator, macOS only), `a` (Android emulator), or scan the QR code with the **Expo Go** app on a phone.

The camera (QR scan) works on a physical device and some emulators.

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # unit tests for the shared logic (gift status, trading, portfolio, billing, redemption, QR)
```

CI runs both, then bundles for iOS and Android.

## Build and release (EAS)

1. `npm i -g eas-cli`, then `eas login` and `eas init` (this fills `extra.eas.projectId` in `app.json`).
2. Edit `eas.json`: replace the `*.example.com` addresses with your real HTTPS addresses.
3. Test builds: `eas build --profile staging --platform all`.
4. Store builds: `eas build --profile production --platform all`, then `eas submit`.

You need an Apple Developer account (iOS) and a Google Play Console account (Android). Bundle id and package are `au.com.growgift.app`; change them in `app.json` before the first store build if you want a different id.

## Before the stores

- Replace the placeholder icon, splash and Android adaptive icon in `assets/` with GrowGift artwork.
- Add a privacy policy URL and complete the App Store and Google Play data-safety forms (account data, camera, purchases made on the web).
- Stripe and Apple/Google rules: gifts of shares and subscriptions are purchased on Stripe's hosted pages. Have the in-app purchase rules reviewed before submission, because Apple and Google can require their own billing for some digital goods.
- Walk through every flow on real devices against the staging backend.

## Staying in sync with the website

Shared business logic is copied from `growgift-core/frontend/lib` and guarded by CI. See `docs/WEB_MOBILE_SYNC.md`. Quick version: change it in the website first, then `npm run sync:pull ../growgift-core`.

## Monitoring and security options

- Crash reporting (Sentry) is off until you set `EXPO_PUBLIC_SENTRY_DSN`. Events are scrubbed: no request bodies, tokens, emails or gift codes.
- Face ID / fingerprint lock: Profile screen, shown when the phone supports it. Locks after 60 seconds in the background.
- Screenshots and recording are blocked while a redemption code is on screen.
- Release builds refuse to start if the API address is not `https://`.

## Branches

`develop` (daily work) → `staging` → `main` (production), promoted by pull request only. See `docs/GIT_WORKFLOW.md`.

## Project layout

```
src/app/        screens (Expo Router file-based routes)
src/components/ shared UI
src/lib/        API client, session, and pure logic shared with the website
tests/          unit tests
```
