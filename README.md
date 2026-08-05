# Relocation Manager USA

This branch contains the production-matched Cloudflare Pages candidate for Relocation Manager USA.

## Source and release boundary

- Branch: `staging/production-baseline-20260806`
- The public `dist/` files were compared with a read-only snapshot of `https://relocationmanagerusa.com/` on 2026-08-06.
- This branch has not been pushed or deployed by this staging session.
- Cloudflare Functions and bindings are included for review, but production data, secrets, D1 contents, KV contents, and R2 contents are not included.

## Local checks

```bash
npm ci
npm run check
```

`dist/` is the Pages build output. `functions/` contains the Pages Functions runtime.

## Product invariants

- The $9.99 shipper plan is post-only.
- Carrier, driver, fleet, and dispatcher plans can find and post loads according to entitlements.
- Carriers can accept a target rate or submit a counteroffer.
- Shippers decide whether to accept or reject a bid.
- Load acceptance must remain atomic and fail closed against double booking.
- Private bids and contact details remain private until the permitted workflow step.
- No social post, outreach, or deployment is authorized by this repository alone.

## Collaboration

- Claude Code: scoped implementation and tests.
- Codex: architecture, security review, QA, and release evidence.
- OpenClaw: approved automation and CRM/social handoffs only.
- Blake approval is required before pushing this branch, changing Cloudflare resources, publishing, outreach, or deploying production.
