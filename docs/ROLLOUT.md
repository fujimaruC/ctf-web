# FlagForge migration and release gates

## Fixed decisions

Scientific Fieldbook; Archivo/IBM Plex Sans; ivory/vermilion and charcoal reading theme; English; beginner-first. React, TypeScript, Vite, React Router, modular Firebase, and Anime.js. Existing accounts, challenge IDs, historical awards, and first bloods remain. Hints are free. Suspension replaces profile deletion. Challenge deletion retains solve history.

The vanilla files remain as reference. Only `dist/` is published. Do not publish the repository root, functions source, migration backups, or legacy scripts.

## Local workflow

1. Use Node 22. Run `npm ci`.
2. Run `npm run dev`. The default is a clearly labeled local preview with in-memory sample data and no production requests. Preview changes reset on reload; a preview session identifier remains in session storage.
3. For Firebase development, copy `.env.example` to `.env.local`, set `VITE_DATA_MODE=firebase`, and supply staging configuration. Run `netlify dev` so Vite and `/api/academy` share one origin. Emulator tools provide the local project ID, `FIRESTORE_EMULATOR_HOST`, and `FIREBASE_AUTH_EMULATOR_HOST`; no private key is needed for that local-only mode. Never use production credentials for tests.
4. Run `npm run build`, `npm test`, and `npm run test:budget`.
5. Run `npm run test:rules` and `npm run test:backend` with Java installed. These commands use only `demo-flagforge` emulators.
6. Run `tests/browser.py` with Python Playwright against the local server. It checks routes, forms, sample solves, admin operations, keyboard focus, responsive layouts, both themes, and axe. Set `FLAGFORGE_TEST_URL` for another local port.

Keep temporary tools under `.local-tools/`. Set `TMPDIR` to its absolute `tmp/` path and `PLAYWRIGHT_BROWSERS_PATH` to its `browsers/` path. Store screenshots in `artifacts/`. Remove temporary tools after checks. Run browser and emulator suites sequentially on machines with limited RAM.

## Gate 1: interface and behavior

- Inspect landing, catalog, challenge, profile, leaderboard, and admin at 1440 and 390 pixels; also test 320 and 768 pixels.
- Test both themes and reduced motion. Change reduced-motion preference while an animation runs.
- Check loading, empty, filtered-empty, denied, deleted, offline, partial, and slow-response states.
- Use keyboard-only navigation, Escape, dialog focus return, 200–400% zoom, and a real screen reader (NVDA, VoiceOver, or Orca).
- Verify every legacy `.html` URL and challenge query parameter. Login must retain the destination.
- Exercise the real Firebase adapter against staging/emulators, not only preview fixtures.

## Gate 2: trusted backend

- Deploy the Netlify site and Firebase rules only to staging after emulator tests pass. Inspect required indexes in staging; emulators do not enforce all production index requirements.
- Confirm students cannot read flags, emails of other users, role data of other users, drafts, request IDs, or audit records. Confirm no client can write scores or roles.
- Submit concurrent correct flags: one award per learner and one first blood per challenge. Retry a lost response using the same request ID.
- Verify case-sensitive and legacy case-insensitive flags, attempts, throttling, suspended users, role changes, and expired sessions.
- Inspect backup/schema anomalies before migration. Do not silently adjust historical points.
- Reconciliation requires maintenance, a reviewed digest, and a backup. It processes at most 50 records per explicit continuation request using server-stored document-ID cursors. It never runs an unbounded browser loop. An interrupted request is safe to retry with the same continuation token; after the 10-minute lease expires, preview again. Do not manually reopen during an incomplete repair.

## Gate 3: migration rehearsal

Use staging data with production-like sizes. Authenticate Admin SDK using Application Default Credentials with the minimum necessary IAM permissions. Never put Admin credentials in `VITE_*` variables.

Dry run:

```sh
node scripts/migrate.mjs --project=STAGING_PROJECT
```

The report contains counts, a digest, and schema/integrity issues. It does not print flags. Fix reported collisions or inconsistencies only after reviewing the intended correction with the operator.

After a write freeze, verified managed Firestore export, and enabled `meta/control.maintenance`, rerun the dry run. Then apply exactly its digest:

```sh
node scripts/migrate.mjs --project=STAGING_PROJECT --apply --confirm-project=STAGING_PROJECT --digest=REVIEWED_DIGEST
```

The script saves a private local backup of the affected collections in `artifacts/migration/` with owner-only file permissions. Treat it as sensitive. Store an encrypted copy separately; do not commit it. It moves flags to `challengeSecrets`, creates safe player projections, normalizes account access fields, and checks username reservations. It leaves maintenance enabled.

Verify account/challenge/solve counts, scores, first-blood counts, original IDs, and private/public separation. Rerunning after a partial migration produces a new reviewable digest. Existing Auth accounts are never replaced. Retain managed exports for full restoration.

## Gate 4: deployment and capacity

- Set all `.env.example` Firebase values in Netlify production environment; set a real `VITE_SUPPORT_EMAIL`. Configure Auth authorized domains for staging/production.
- Set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` as Netlify server environment variables. The private key may use escaped `\\n` line breaks. These are secret credentials; Firebase web `VITE_*` configuration is intentionally public.
- Review and finalize academy privacy/retention information and terms before launch. Set `FLAGFORGE_RELEASE_READY=reviewed` only after these checks and the gates below.
- Test the built site with Netlify headers. Inline scripts are disallowed; CSS inline styles remain allowed for Anime.js. Inspect actual Firebase/Functions network calls against CSP.
- Public entry JS ≤250 KiB compressed; authenticated entry ≤350 KiB; fonts ≤100 KiB; initial public transfer ≤500 KiB. `test:budget` checks the stricter total built JS ceiling.
- Measure mobile LCP ≤2.5s, CLS ≤0.1, and INP ≤200ms. Report lab and field measurements separately.
- Load-test 100 concurrent learners using separate emulator/staging accounts and unique request IDs. Measure correct awards and p95 warm submission ≤2s; report cold starts separately. Local concurrency tests establish correctness, not production capacity.
- Verify service-worker retirement from a browser already controlled by the old worker. Only `ctf-daily-*` caches are deleted. Keep `/sw.js` available with `no-store` until old clients have updated.

## Production cutover

1. Announce maintenance. Freeze legacy writes with verified rules, not only the new UI setting. Drain in-flight writes. Export production data and save deployed rules, indexes, configuration, and release artifacts.
2. Enable maintenance, run fresh migration dry-run, review digest/issues, and apply. No production migration is part of local implementation verification.
3. Deploy the reviewed rules, indexes, and Netlify build. Keep maintenance enabled.
4. Rotate flags previously delivered to browsers, coordinating challenge attachments. Old answers cannot become confidential merely by moving them.
5. Smoke-test Auth, direct URLs, real submissions, ranking, admin actions, CSP, caching, and legacy-worker updates. Reconcile counts and historical awards.
6. Reopen only after review. Watch API error rates, permission denials, duplicate-award checks, Firestore reads, latency, and billing. Do not log submitted flags or personal profile data.

## Rollback

## Netlify credentials and staging

Create a staging deploy from the reviewed branch, set the `VITE_*` Firebase web configuration and the three `FIREBASE_ADMIN_*` variables in Netlify, then verify Auth, Firestore rules, and `/api/academy` against the staging project before promoting it. Firebase web configuration is public by design; Admin credentials are server-only secrets and must never be committed or prefixed with `VITE_`.

To rotate credentials, create a replacement service-account key with only Firebase Authentication token verification and Firestore access for this project, update all three Netlify variables, deploy the verified site, then revoke the old key in Google Cloud IAM. If a key is exposed, immediately revoke it, rotate the Netlify values, and review Netlify/Firebase audit logs. Do not store service-account JSON or private keys in the repository.

Netlify synchronous functions have a 60-second limit. Reconciliation therefore uses 50-record batches with a server-held cursor and progress state. If a batch fails or the browser closes, reopen the admin page and retry the same continuation token; the server accepts it only for the active run step, so a committed retry returns current progress without applying the batch twice.

- Before production changes: discard the candidate; legacy remains untouched.
- Before reopening: stay in maintenance and restore the reviewed backup/configuration as necessary. Do not restore publicly readable flags or permissive client scoring rules.
- After reopening: roll back only to a backend-compatible build or maintenance deployment. Never overwrite new solves with an old database snapshot.
- Retain original exports, release artifacts, and migration manifests through stabilization. Remove local private backups only after confirming their secure retained copy.

## Explicit production prerequisites

Live project rules/indexes, provider configuration, actual database region, verified contact/retention information, flag rotation, human screen-reader review, real-device performance, and 100-user staging load results require operator/environment verification. A local build is not evidence that these release gates passed.

## Reproducing the Firebase browser gate

With Python Playwright installed and workspace-local browser binaries available, run:

```sh
firebase emulators:exec --only auth,firestore --project demo-flagforge 'python tests/firebase_browser.py'
```

The script seeds only the demo emulator, starts Netlify Dev on port 5174, exercises actual Auth/Firestore/API integration, then stops its server. Set `TMPDIR`, `PLAYWRIGHT_BROWSERS_PATH`, and `FIREBASE_EMULATORS_PATH` to workspace-local folders before running it. For constrained machines, cap Java with `JAVA_TOOL_OPTIONS='-Xmx384m -Djava.io.tmpdir=ABSOLUTE_WORKSPACE_TEMP_PATH'`.
