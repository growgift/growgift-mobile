## What and why

## Checklist
- [ ] `npm run typecheck` and `npm test` pass
- [ ] Tested on iOS and Android (simulator, emulator or device), or noted why not
- [ ] No secrets, tokens, customer addresses or redemption codes in code, logs or screenshots
- [ ] If this changes shared business logic: changed in `growgift-core/frontend/lib` first, then `npm run sync:pull`
- [ ] If this needs a backend change: linked the `growgift-core` PR
- [ ] Money or order flow touched: idempotency key kept, "unconfirmed" outcomes still not shown as failed
