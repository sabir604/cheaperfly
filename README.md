# CheaperFly website

Next.js website using same-origin customer/public API adapters and the shared backend in `../cheaperfly-admin-next`. Shared wire contracts are kept in this repo at `packages/api-contracts` (a matching copy lives in `cheaperfly-admin-next/packages/api-contracts`; keep both in sync).

Use Node 22 (`nvm use`). From this directory:

```sh
npm ci
# Only when .env.local does not already exist:
cp -n .env.example .env.local
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000`; start the admin backend on port 3001 in another terminal. `CHEAPERFLY_BACKEND_URL` is server-only and defaults to `http://127.0.0.1:3001` in development; production requires an explicit origin. `CHEAPERFLY_API_TIMEOUT_MS` defaults to 8000. Preserve existing environment files and never copy administrator credentials into this project.

[Shared startup, environment, simulated providers, health and recovery guide](../integration/OPERATIONS.md) · [Step 16 report](../integration/STEP_16_REPORT.md)

Website adapters use `/api/{public|customer}/v1/...`, map HttpOnly cookies to isolated backend credentials, and consume private tokens before returning browser responses. Staff credentials cannot authorize customer requests. Browser demo accounts/bookings/config overrides are not imported. Email, payments, refunds, WhatsApp and visa operations remain explicitly simulated.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start -- --hostname 127.0.0.1
```

The build may fetch the existing Google Font. Backend Swagger and generated schemas are available at `http://127.0.0.1:3001/api-docs`; see the shared guide for namespace and cookie differences.

## Integration baseline checks

Use Node.js 22 for both applications (`.nvmrc` is included). This keeps the website runtime consistent with the admin's native SQLite driver. If your shell defaults to Node 20, run `nvm use` in each application before installing or starting it.

```sh
nvm use
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

The website normally uses port 3000 and the admin uses port 3001. Do not stop another development server to run checks: use a separate production preview with `npm run start -- --port 3100 --hostname 127.0.0.1`.

Independent baseline tests are in `tests/unit/core.test.ts`. Archive parity suites still skip when `../tools/archiver/turbo-shim.js` is absent; a skipped suite is not a passing parity check. See `../INTEGRATION_CHECKLIST.md` and `../integration/STEP_02_REPORT.md` for the integration workflow and recorded validation.

Visual references can be reproduced from the workspace root using `node integration/capture-baseline.mjs` against the port 3100 preview. The script uses a fresh isolated browser with fictional demo data and records desktop/mobile screenshots plus a manifest. To capture a later comparison without overwriting the baseline, set `VISUAL_OUTPUT=/private/tmp/cheaperfly-visual-current`. It does not submit a real or simulated payment. Chrome must be installed.

Step 3 API environment settings, active routes and customer session policy are documented in [the transport contract](../integration/STEP_03_CONTRACT.md). The [Step 3 report](../integration/STEP_03_REPORT.md) records verification and outstanding environment limits. Build both applications, then run `node integration/check-transport.mjs` from the workspace root to check the production transport with a disposable database.

Customer authentication now uses server sessions; browser-local demo credentials are no longer accepted or imported. Sign up through the existing screen and use the explicitly enabled development Demo inbox to verify. Existing local admin settings were preserved. See the [Step 5 report](../integration/STEP_05_REPORT.md) for configuration, behavior and current verification limits.

Profile, preferences, saved travellers and notification actions now persist through the customer API. The profile's contact email is separate from the verified sign-in email. Account reads have loading/retry states and customer-scoped caches; see the [Step 6 report](../integration/STEP_06_REPORT.md) for migration/startup details and remaining browser acceptance.

Published website content and features now load from the backend on startup, every 15 seconds and on focus. Existing `cf-config` browser overrides are ignored and never imported. Defaults remain unchanged until an authorized publication. See [Step 7](../integration/STEP_07_REPORT.md).
