# FlagForge private deployment notes

This file is intentionally ignored by Git. Keep deployment secrets and environment-specific details here, not in the repository.

## Netlify
- Keep the site on Netlify with Functions enabled.
- The flag endpoint is `/.netlify/functions/submit-flag`.
- Set `FIREBASE_SERVICE_ACCOUNT_JSON` in Netlify Project configuration > Environment variables.
- Never commit the service-account JSON, `.env`, or other sensitive credentials.
- Redeploy after environment-variable changes.

## Firebase / Firestore
- Deploy `firestore.rules` to the production project.
- Keep challenge flags out of public challenge documents. New challenges use `flagHash`.
- Migrate old challenges from plaintext `flag` to `flagHash` before publishing them.
- Confirm users cannot modify `points`, `solves`, `firstBloods`, or `role`.
- Confirm only admins can manage challenges and users.
- Confirm clients cannot create/update solves or attempts directly.
- Review Authentication providers and authorized domains.
- Restrict the Firebase/Google Cloud API key appropriately.

## Existing Firebase API key
The browser Firebase API key is configuration rather than a service-account secret, but it should still be restricted. It has existed in Git history, so review provider-side restrictions and rotate it if your project policy requires a fresh key.

## Challenge migration
For every legacy challenge:
1. Read the existing flag as admin.
2. Compute its SHA-256 hash.
3. Save `flagHash`.
4. Remove plaintext `flag`.
5. Test submission through the server function.
6. Only then publish.

## Local checks
- `npm install`
- `netlify functions:serve`
- Unauthenticated submit -> 401.
- Wrong flag -> no score change.
- Correct flag -> one solve and one score award.
- Repeated correct submission -> no duplicate score.
- Concurrent first solves -> one first blood.
- Direct browser writes to solves/attempts -> denied.

## Production checklist
- Firestore rules deployed.
- Netlify service-account variable configured.
- Function verifies Firebase ID tokens.
- All legacy challenges migrated.
- Sensitive historical credentials rotated at their provider.
- Login, challenges, submission, leaderboard, and admin flows tested.
- Netlify function logs checked after deployment.

Project history note: this project was originally built during the SMK phase. Treat this as the handoff checklist for bringing the old implementation to a safer deployment architecture.
