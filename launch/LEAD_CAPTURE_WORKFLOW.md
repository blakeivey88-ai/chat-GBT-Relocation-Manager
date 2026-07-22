# Lead Capture Workflow — Stage 1

## Current setup

Relocation Manager's live waitlist form posts to a Cloudflare Pages Function at `/api/leads`.

The function stores each submission in Cloudflare KV:

- Binding: `RELOCATION_MANAGER_LEADS`
- Namespace ID: `59046e24e3cd4d56b409dc3a70f02e3e`
- Project: `relocation-manager`

## Fields captured

- name
- email
- phone
- company/business name
- customer/driver/broker type
- equipment or load need
- pickup area/home base
- preferred lane
- target rate or budget
- Instagram/social handle
- consent to receive account and service communications
- notes
- created timestamp
- updated timestamp
- verification status: starts as `new`
- payment status: starts as `unpaid_waitlist`
- tags: start with `new-lead` and the right business-type tag

## Export leads to CSV

From `relocation-manager/`, run:

```bash
node scripts/export-leads.mjs
```

This writes a dated CSV file under `launch/`, for example:

```bash
launch/leads-2026-07-12.csv
```

Optional custom output path:

```bash
node scripts/export-leads.mjs launch/leads-latest.csv
```

## Manual triage process

1. Export leads daily during launch.
2. Review newest leads first.
3. Mark each lead as one of:
   - `new`
   - `contacted`
   - `qualified`
   - `needs_verification`
   - `not_fit`
   - `converted`
4. Keep these tags in place or update them as the lead changes:
   - `new-lead`
   - business-type tags like `shipper`, `driver`, or `broker`
   - payment tags like `paid-member`, `basic-plan`, `professional-plan`, or `premium-plan`
5. For paid Stripe customers, update payment status manually until Stripe webhook automation exists:
   - `unpaid_waitlist`
   - `paid_shipper`
   - `paid_driver`
   - `paid_fleet_starter`
   - `paid_fleet_growth`
   - `paid_fleet_pro`
6. Follow up through email, phone, or Instagram DM depending on what they provided.

## Next improvement

Connect Stripe payment-success events to the same lead tracker so paid customers are tagged automatically.
