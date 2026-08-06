# Staging status

**Date:** 2026-08-06  
**Branch:** `staging/production-baseline-20260806`  
**Current candidate commit:** `66dd5a4`

## Verified

- Candidate public files match the read-only production snapshot for homepage, public CSS/JS, sitemap, robots file, and eagle/semi assets.
- Candidate includes Cloudflare Pages output, Functions, `wrangler.toml`, and package lockfile.
- Candidate `functions/api/loads.js` is newer than the earlier review packet and includes failure logging and subsequent hardening changes.
- The packet's D1 migration history and focused load-board regression tests are now included in this staging branch.
- `npm run check` passes: syntax checks plus **21/21** tests—20 load authorization/photo/bid/acceptance/concurrency tests and one migration-layout guard.
- Local Wrangler Pages smoke test served the homepage and assets with 200 responses, redirected unauthenticated member routes to sign-in, and returned 401 for unauthenticated `/api/loads`.
- Fresh local D1 migration run applies only the nine forward migrations; rollback scripts are stored under `migrations/down/` and are excluded from Wrangler's forward-migration directory.
- A synthetic signup and email-verification flow completed successfully against fresh local D1. No production account or credential was used.
- Carrier authority gating was corrected so DOT/MC is conditional for non-commercial-authority carriers; identity and insurance remain required. The focused suite is now **20/20** including the migration-layout guard.
- A migration-layout regression guard now prevents rollback scripts from being placed in Wrangler's forward migration directory.
- Local authenticated QA completed signup, email verification, a paid-account fixture, workbench access, find-loads, the post form, save-draft, and preview. The synthetic account was local-only.
- Open product decision: an account with explicit `claim` access can find and bid but is rejected when final-posting a load; do not change this gate until Blake confirms whether carriers may publish or only bid.
- A regression test now preserves that explicit-`claim` behavior until the product decision is approved.

## Not yet verified

- Full browser/UI automated suite in this repository.
- Live D1 migration correspondence and production cutover state.
- Full authenticated carrier browser flow after local verification fields are populated.
- R2 bucket and cutover state.
- Authenticated role-based browser flows.
- Replit import and deployment configuration.
- OpenClaw/Claude shared handoff execution.

## Release hold

Do not push or deploy this branch. The next work item is to resolve the carrier `claim` versus `claim_post` product rule, add the approved regression test, then run a no-deploy local verification.
