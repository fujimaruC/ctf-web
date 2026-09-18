# FlagForge Academy

React, TypeScript, Vite, React Router, modular Firebase, and Anime.js. The approved Scientific Fieldbook interface lives in `app/`; vanilla files remain as migration references.

## Local preview

Use Node 22, then run `npm ci`. There is no implicit data mode: set `VITE_DATA_MODE=demo` only for a labeled local fixture run, then run `npm run dev`. Reloading resets fixture changes. It never connects to production.

For Firebase-backed local development, copy `.env.example` to `.env.local`, set `VITE_DATA_MODE=firebase` and `VITE_USE_EMULATORS=true`, then run `netlify dev`. The API is available at `/api/academy`; Netlify Dev serves Vite and the function from the same origin. Emulator tools provide the local project ID. Never put `FIREBASE_ADMIN_*` values in `VITE_*` variables.

For Firebase-backed staging or production, enable **Google** in Firebase Authentication, disable Email/Password, and add each local, staging, and production domain to Firebase Auth's authorized domains. The app uses Google popup sign-in and continues with redirect sign-in where popups are blocked or unsuitable for mobile. Firebase web `VITE_*` configuration is public; Admin credentials remain server-only. Google email addresses never grant admin access: the Netlify API verifies the Firebase ID token and checks the existing Firestore role.

For staging configuration, see `.env.example` and [release gates](docs/ROLLOUT.md). Publish only `dist/`; do not commit `.env.local`, service-account JSON, private keys, tokens, exports, or migration backups.

After deploy, run read-only routing checks:

```sh
npm run smoke:deploy -- https://flagforge-arena.netlify.app
```

## Verification

```sh
npm run build
npm test
npm run test:budget
npm run test:rules
npm run test:backend
```

Emulator tests require Java and use only `demo-flagforge`. Browser checks use Python Playwright: start the fixture server explicitly with `VITE_DATA_MODE=demo npm run dev`, then run `python tests/browser.py`; `firebase emulators:exec --only auth,firestore --project demo-flagforge 'python tests/firebase_browser.py'` checks the Firebase Google-only entry. Google OAuth itself requires a configured authorized domain and is manually verified in staging. Keep temporary tools, browser downloads, emulator downloads, and `TMPDIR` under `.local-tools/`; remove that folder after verification. Run heavy suites sequentially on RAM-limited machines.

Migration defaults to a dry run and requires an explicit project, reviewed digest, and maintenance window before applying. See [migration, verification, and rollback instructions](docs/ROLLOUT.md). Production deployment is a separate operator gate.
