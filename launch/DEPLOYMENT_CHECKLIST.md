# Deployment Checklist — Stage 1

## Before deployment

- [x] Stage 1 landing page exists
- [x] Three pricing tiers added
- [x] Ralph load helper added
- [x] Instagram account created: @relocationmanagerusa
- [x] First Instagram post published
- [x] Choose domain: `relocationmanagerusa.com`
- [x] Deploy page: Cloudflare Pages project `relocation-manager`
- [x] Connect waitlist form
- [x] Create payment links
- [x] Wire Stripe payment links into live pricing CTAs
- [ ] Connect Stripe webhook automation
- [ ] Put live link in Instagram bio
- [x] Add privacy/terms placeholders

## Recommended deployment path

1. Deploy static site from `relocation-manager/stage-one.html` and `stage-one.css`.
2. Connect waitlist form to a Google Sheet, Airtable, Tally, or Supabase table.
3. Add Stripe Payment Links for Shippers, Independent Driver, Fleet Starter, Fleet Growth, and Fleet Pro tiers.
4. Add the live URL to Instagram bio.
5. Track every lead in `LEAD_TRACKER_TEMPLATE.csv` or a real CRM sheet.

## Stage 1 success metric

Within 2 weeks:

- 100+ driver/carrier leads
- 10+ customer/broker/shipper leads
- first paid customer/broker account
- clear list of top pickup lanes and equipment types
