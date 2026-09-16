# FlagForge Academy

React, TypeScript, Vite, React Router, modular Firebase, and Anime.js. The approved Scientific Fieldbook interface lives in `app/`; vanilla files remain as migration references.

## Local preview

Use Node 22, then run `npm ci` and `npm run dev`. The default preview uses labeled sample accounts and in-memory data. Reloading resets sample changes. It never connects to production.

For staging configuration, see `.env.example` and [release gates](docs/ROLLOUT.md). Publish only `dist/`.

## Verification

```sh
npm run build
npm test
npm run test:budget
npm run test:rules
npm run test:backend
```

Emulator tests require Java and use only `demo-flagforge`. Browser checks use Python Playwright: `python tests/browser.py` against the preview server. Keep temporary tools, browser downloads, emulator downloads, and `TMPDIR` under `.local-tools/`; remove that folder after verification. Run heavy suites sequentially on RAM-limited machines.

Migration defaults to a dry run and requires an explicit project, reviewed digest, and maintenance window before applying. See [migration, verification, and rollback instructions](docs/ROLLOUT.md). Production deployment is a separate operator gate.
