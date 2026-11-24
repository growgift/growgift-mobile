# Keeping the website and the mobile app in sync

## What is shared, and how

| Layer | How it stays in sync |
|---|---|
| Backend and API | One gateway (`/api/v1`) serves both. A backend fix reaches web and mobile at the same time. |
| Business logic (gift status wording, trading maths, portfolio totals, brokerage gate, billing, redemption rules) | Lives in `growgift-core/frontend/lib`. Copied into `src/lib` and listed in `shared.manifest.json`. CI fails if the copies differ. |
| Screens and UI | Separate (React/Next.js vs React Native). They call the same logic, so wording and rules match. |
| Payments, KYC form | Hosted on Stripe and the website. A change there appears in the app with no app release. |

## Rules

1. Change shared logic **in the website first** (`frontend/lib`), merge it, then in this repo run
   `npm run sync:pull ../growgift-core` and commit the result.
2. Never edit a shared file in `src/lib` by hand. The CI job `shared-logic-sync` will fail the pull request.
3. Add a new shared file by adding it to `shared.manifest.json` (and keep it free of browser and React Native imports).
4. Check locally: `npm run sync:check ../growgift-core`.

## Backend changes

- Add fields: safe. Old app versions ignore them.
- Rename or remove a field, or change meaning: **breaking for installed apps**. Users do not all update at once.
  Keep the old field for at least two app releases, or version the endpoint (`/api/v2`).
- Release order for breaking changes: backend (supports old and new) → app release → wait for adoption → remove old.
- Consider a minimum-supported-app-version check on the gateway so very old apps get an "Update required" screen.

## Shipping fixes quickly

- Logic or wording bug: fix in the website, sync, release the app. After EAS Update is enabled this ships over the air
  without a store review (JavaScript-only changes; not native or permission changes).
- Server bug: fix once in `growgift-core`; both clients benefit immediately.
- Release path: `develop` → `staging` (EAS staging build, internal testers) → `main` (production build and store submission).

## One-time setup

- GitHub repo secret `CORE_READ_TOKEN`: fine-grained token, read-only Contents access to `growgift-core`.
- Add the same check in `growgift-core`'s CI so a website change that touches `frontend/lib` warns that mobile needs `sync:pull`.
