# Replit staging handoff

## Import target

Import the private GitHub repository and select branch:

`staging/production-baseline-20260806`

Do not import `main` as the implementation target; it is an older prototype source.

## First Replit Agent prompt

```text
Open and read README.md, docs/PRODUCTION-SOURCE-BOUNDARY.md,
docs/STAGING-STATUS.md, and docs/COLLABORATION-HANDOFF.md before editing.

Run npm ci and npm run check. Do not deploy, push, connect production
Cloudflare resources, modify Stripe, change Buffer, publish social content,
or contact anyone. Inspect the existing load-board Functions and propose the
next bounded browser-test task. Preserve the $9.99 post-only rule, conditional
DOT/MC authority requirement, private bids, atomic acceptance, and all release
holds. Wait for Blake approval before implementation changes beyond tests.
```

## Required Replit secrets

Do not copy production secrets into a development workspace. Use local/test values for development, and add production secrets only during an explicitly approved release process.

## Verification before any publish

1. `npm run check` passes.
2. Local D1 forward migrations apply without rollback scripts.
3. Public parity is checked against the production snapshot.
4. Authenticated shipper/carrier browser flows pass with synthetic accounts.
5. Blake approves the exact commit and deployment target.
