# Production source boundary

Status: staging preparation only. No production deployment is authorized by this document.

## Evidence

- Git repository: `https://github.com/blakeivey88-ai/chat-GBT-Relocation-Manager`
- Current branch: `main`
- Current commit: `f847db6` (`Fix clean URL redirect loops`)
- Live site: `https://relocationmanagerusa.com/`
- Reviewed production packet: `outputs/claude-load-board-review-packet-2026-08-02/` in the Codex evidence workspace

## Important discrepancy

The Git checkout is not a byte-for-byte copy of the live production artifact. The checkout is an older static/prototype-oriented application. The live site contains newer public copy and layout, while the reviewed production packet contains the exact load-board runtime files and tests for a later deployment.

Do not deploy `main` directly until the production artifact is reconstructed or the repository is explicitly migrated and reviewed.

## Staging rule

All implementation work must occur on a branch named `staging/*` or `feature/*`. The production domain, Cloudflare project, D1 database, KV namespaces, R2 buckets, Stripe account, Buffer channels, and Launchpad tasks are external systems and require explicit Blake approval before mutation.

## Ownership

- Claude Code: implementation and tests in this repository.
- Codex: architecture, security review, source comparison, release evidence, and approval gates.
- OpenClaw: automation and CRM/social orchestration only after the website interfaces and approval rules are documented.
