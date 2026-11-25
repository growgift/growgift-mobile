# GrowGift Mobile: Local Setup Guide

Run the GrowGift iOS and Android app on your own computer or phone, against the local GrowGift backend. About 20 minutes once the backend is running.

> Status: the app builds for both platforms (TypeScript, unit tests and iOS and Android bundles pass in CI). It has not yet been tested end-to-end on a simulator, emulator or phone, so report anything that does not behave as described here.

---

## 1. What you need

| Item | Needed for | Notes |
|---|---|---|
| The GrowGift backend and website running locally | Everything | Follow `growgift-core/docs/GrowGift-Local-Setup-Guide.md` first. You need the gateway on port 8080 and the website on port 3000. |
| Node.js 22 LTS and Git | Always | `brew install node@22 git` on macOS |
| **Expo Go** app | Quickest way to try it on a real phone | App Store or Google Play |
| Xcode (Mac only) | iOS Simulator | From the Mac App Store. Open it once and accept the licence. |
| Android Studio | Android emulator | Create a virtual device in Device Manager (a recent Pixel image is fine). |

You can use just a real phone with Expo Go, or just one simulator. You do not need all of them.

---

## 2. Get the code

```bash
git clone https://github.com/growgift/growgift-mobile.git
cd growgift-mobile
git checkout develop
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is needed because of a peer-dependency conflict in the Expo toolchain. It is safe here, and the repo's `.npmrc` sets it for you, so plain `npm install` and `npm ci` also work. `.nvmrc` pins Node 22 (`nvm use`).

**Do not upgrade packages by hand.** The versions in `package.json` and `package-lock.json` are a matched set for Expo SDK 58. Avoid `npm update`, `npm install <pkg>@latest` and a bare `npx expo install --fix` on a working checkout; they can leave Expo and React Native on different SDK generations (see the first row of the troubleshooting table). Add packages with `npx expo install <package>`. SDK upgrades are done deliberately, on their own branch.

Keep `growgift-mobile` and `growgift-core` as sibling folders. The sync check in section 8 expects `../growgift-core`.

---

## 3. Point the app at your backend

The app only talks to the gateway (`/api/v1`) and uses the website for the identity form and Stripe return pages.

```bash
cp .env.example .env
```

Edit `.env`. The right address depends on **where the app runs**, because `localhost` on a phone or emulator means the phone itself:

| Where the app runs | `EXPO_PUBLIC_API_BASE` |
|---|---|
| iOS Simulator | `http://localhost:8080/api/v1` |
| Android emulator | `http://10.0.2.2:8080/api/v1` |
| Real phone (Expo Go) | `http://<your computer's LAN IP>:8080/api/v1` |

Set `EXPO_PUBLIC_WEB_BASE` the same way, with port 3000, for example `http://192.168.1.20:3000` for a real phone.

Find your LAN IP on macOS with `ipconfig getifaddr en0` (Wi-Fi). On Linux, `hostname -I`.

Optional settings (leave unset for local work):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | Turns on crash reporting. Off when empty. |
| `EXPO_PUBLIC_APP_ENV` | Label sent with crash reports. Default `development`. |

These are public settings and are bundled into the app. **Never put API keys or secrets in `.env`.** The app has none; all Stripe, ViewTrade and Shippit calls happen on the server.

`.env` is git-ignored. After changing it, restart Metro with `npx expo start -c`.

---

## 4. Start the app

```bash
npx expo start
```

Then choose where to run it:

- **iOS Simulator:** press `i` (Mac only).
- **Android emulator:** start the emulator in Android Studio first, then press `a`.
- **Real phone:** make sure the phone and computer are on the **same Wi-Fi**. Scan the QR code shown in the terminal. On iPhone use the Camera app; on Android open Expo Go and scan from inside it.

Shake the device (or press `m` in the terminal) for the developer menu. Edits to the code reload automatically.

### Real phone checklist
- Same Wi-Fi network (some guest or office networks isolate devices, so use a home network or hotspot).
- Your computer's firewall allows incoming connections on 8080, 3000 and 8081 (Metro).
- `.env` uses the LAN IP, not `localhost`.
- Test reachability: open `http://<LAN IP>:8080/healthz` in the phone's browser. It should say Healthy.

---

## 5. Try the main flows

Use Stripe **test mode** and ViewTrade **sandbox** only. Do not place real market orders.

1. **Sign up** as a buyer, then **sign in**.
2. **Collections**: choose one and build a gift with the **Send a gift** button.
3. **Pay**: the app opens Stripe's hosted page in an in-app browser. Use a Stripe test card such as `4242 4242 4242 4242`, any future expiry and any CVC. This needs `STRIPE_SECRET_KEY` (test) set on the backend.
4. **My gifts**: open the order and use **Show redemption code**. Screenshots are blocked while a code is shown.
5. **Redeem**: sign in as a recipient, enter the code (or scan the QR). Identity verification opens on the website.
6. **Profile**: turn on Face ID / fingerprint lock if your device has it set up.
7. **Family** (parent accounts) and the **child** login (login code and PIN) for the family features.

---

## 6. Checks and tests

```bash
npm run typecheck     # TypeScript
npm test              # unit tests for shared logic (gift status, trading, portfolio, billing, redemption, QR, log scrubbing)
npm run sync:check ../growgift-core   # shared logic matches the website
```

To confirm both platforms bundle:

```bash
npx expo export --platform ios --output-dir /tmp/ios
npx expo export --platform android --output-dir /tmp/android
```

---

## 7. Expo Go limits

Expo Go is for quick checks. Some things behave differently from a real build:

- Face ID, crash reporting and screen-capture blocking may be limited or behave differently inside Expo Go.
- For a closer-to-real build, make a development build with EAS (`eas build --profile development`) or run `npx expo run:ios` / `npx expo run:android`, which need Xcode or Android Studio.
- Deep links use the `growgift://` scheme, which only fully works in a development or store build.

---

## 8. Working with the website (shared logic)

Business rules shared with the website (gift status wording, trading maths, portfolio totals, billing and redemption rules) live in `growgift-core/frontend/lib` and are copied here. The list is in `shared.manifest.json`.

- Never edit those copies in `src/lib` by hand.
- Change them in the website, merge, then here run `npm run sync:pull ../growgift-core` and commit.
- CI fails if the copies differ. See `docs/WEB_MOBILE_SYNC.md`.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Package subpath './src/lib/TerminalReporter' is not defined by "exports" in .../metro/package.json` when running `npx expo start` | `node_modules` does not match `package.json`: for example an older `expo` (SDK 52) installed next to React Native 0.88 and Metro 0.87, usually after `npm update`, `@latest` installs or `expo install --fix` | Do not downgrade packages. Throw away the local install and rebuild it from the repo: `git checkout -- package.json package-lock.json`, `rm -rf node_modules`, `npm ci`, then `npx expo start -c`. Check with `npm ls expo` (must show `expo@58.x`) |
| `npm warn install-scripts … @sentry/cli postinstall blocked` | npm 12 blocks install scripts by default | Harmless for running the app. Only needed for uploading source maps in release builds; run `npm install-scripts approve @sentry/cli` if you use Sentry source maps |
| `[@sentry/react-native/expo] Missing config for organization, project` | Sentry plugin has no org/project | A warning only. Ignore it, or set `SENTRY_ORG` and `SENTRY_PROJECT` for release builds |
| "Network request failed" or "can't reach server" | Wrong API address for where the app runs | Check section 3. Open the health URL in the phone's browser. Restart Metro with `-c` after editing `.env`. |
| Works in iOS Simulator, fails on Android emulator | `localhost` used on Android | Use `10.0.2.2` |
| Works on computer browser, fails on phone | Firewall or Wi-Fi isolation | Allow ports 8080, 3000, 8081; use the same Wi-Fi |
| QR code scan does nothing in Expo Go | Different network, or Expo Go too old | Same Wi-Fi; update Expo Go; or press `i` / `a` instead |
| Expo Go says the project needs a different SDK | Expo Go version does not match SDK 58 | Update Expo Go from the store |
| `npm install` fails with `ERESOLVE` | Missing flag | `npm install --legacy-peer-deps` |
| Changes to `.env` ignored | Metro cache | `npx expo start -c` |
| Blank screen, red error screen | JavaScript error | Read the terminal; press `r` to reload |
| After payment, the return page does not open | The backend's Stripe return links point at an address the phone cannot reach | Make the website address the backend uses reachable from the phone (use your LAN IP) |
| Camera or QR scan unavailable | Emulator has no camera, or permission denied | Use a real phone; allow Camera in system settings |
| "App lock" option missing | No Face ID or fingerprint enrolled | Enrol one in the device settings |
| Signed out unexpectedly | Access tokens expire after 15 minutes | Sign in again. This is by design. |
| Release build refuses to start | API address is not `https://` | Use an HTTPS address in the EAS profile |
| `Unable to boot simulator` or `xcrun` errors | Xcode not set up | Open Xcode once, accept the licence, run `xcode-select --install` |
| `ANDROID_HOME` not set / adb not found | Android SDK path | Add the SDK `platform-tools` folder to PATH (Android Studio, Settings, SDK Manager shows the path) |

---

## 10. Next steps

- Release builds and the app stores: see the **Build and release (EAS)** section of `README.md`.
- Branching: `develop` then `staging` then `main`, by pull request. See `docs/GIT_WORKFLOW.md`.
