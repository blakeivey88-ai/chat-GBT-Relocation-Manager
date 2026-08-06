# Claude / Codex / OpenClaw handoff

## Canonical branch

Work from `staging/production-baseline-20260806`. Do not use `main` for implementation until the staging candidate is reviewed and Blake approves the push/merge plan.

## Current evidence

- Public production parity verified for the homepage surface and approved eagle/semi assets.
- `npm run check` passes syntax checks and 18/18 focused load-board tests.
- Local Wrangler Pages smoke test passes public routes and unauthenticated protections.

## Claude Code assignment

Inspect the staged Functions and test coverage. Propose the next bounded implementation task for authenticated role-based browser tests. Do not deploy, push, modify Cloudflare resources, or change social integrations.

## Codex assignment

Review architecture, permission boundaries, migration correspondence, test evidence, and release readiness. Record findings in `docs/STAGING-STATUS.md` and the shared Obsidian vault.

## OpenClaw assignment

Do not publish, follow, comment, DM, or perform outreach. Prepare only approval-gated CRM/social handoff metadata if requested. Facebook remains research-only.

## Required handoff format

Every agent update must include:

1. branch and commit
2. files changed
3. tests run and exact result
4. external systems touched (or `none`)
5. next action and approval needed
