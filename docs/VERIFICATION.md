# Local verification record

## Scope

React application, legacy callable reference, rules, migration script, and deployment configuration. No live Firebase project was accessed or deployed. Legacy pages and existing unrelated changes remain intact.

## Dependency review

`npm audit --omit=dev --registry=https://registry.npmjs.org` reports nine moderate package entries, all propagated from **GHSA-w5hq-g745-h8pq** (`uuid` before 11.1.1: missing buffer bounds checks in v3/v5/v6 with caller-provided buffers). No high or critical advisories were reported.

Reachability review of the installed dependency tree found only `uuid.v4()` without buffer arguments in:

- `gaxios/build/src/gaxios.js`
- `@google-cloud/firestore/node_modules/google-gax/build/src/util.js`
- `@google-cloud/firestore/node_modules/teeny-request/build/src/index.js`
- `@google-cloud/storage/node_modules/teeny-request/build/src/index.js`

Application code does not import UUID. No attacker-controlled path to the affected APIs was found. Retain this scoped exception for the current lockfile; rerun the audit and reachability check after dependency changes. A major Admin/Functions SDK upgrade needs a separate compatibility check. This is not a clean advisory scan.

## Release limits

Local tests do not establish production capacity, real-device performance, screen-reader usability, hosted CSP behavior, deployed indexes, or correct operator configuration. Those remain explicit gates in [ROLLOUT.md](ROLLOUT.md).

## Historical local gates — 2026-09-16

- Preview and Firebase-configured production bundles compiled with strict TypeScript.
- Domain and release-configuration checks passed.
- Firestore emulator access matrix passed, including missing/deleted records, draft privacy, suspension, and denial of all direct writes.
- The former Auth/Firestore/Functions emulator test results applied to the legacy callable implementation. Rerun the Netlify API emulator gate before release.
- Migration rehearsal passed: default dry run, stale-digest refusal, private backup, flag relocation, historical point preservation, and a clean subsequent dry run.
- Real Firebase browser adapter passed signup/profile creation, initial missing-attempt reads, incorrect and correct submissions, solve persistence after reload, and leaderboard retrieval.
- Firebase bundle: public JS 157.2 KiB gzip; complete JS 331.9 KiB gzip; WOFF2 fonts 59.9 KiB; CSS 4.4 KiB gzip. Both public and authenticated budgets passed. Firestore is deferred until needed. Vite reports a size warning for its deferred Firestore chunk; the compressed budget passes.

Host verification used Node 26 and Java 26; deployment targets Node 22. Repeat the gates on Node 22 in staging/CI before release. Emulator results establish correctness, not 100-user capacity.

Final built-preview browser regression passed: learner and instructor flows, Cancel/Back draft protection, dialog Escape, legacy queries, missing challenges, 404, keyboard focus, live reduced-motion changes, responsive layouts (320/390/768/1440), and light/dark axe WCAG checks. Screenshots remain in `artifacts/` for review. The final preview build passes its budget at 123.5 KiB public JS and 136.3 KiB total JS gzip. Automated checks do not replace the human screen-reader gate.

Temporary Python/Chromium/emulator/formatter tooling and demo migration backups were removed after verification. No commits, branches, billing changes, or deployments were made in this continuation.
