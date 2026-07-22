# Upgrade Suggestions

## Product direction

1. **Lead with trust, not just load search.** The unique wedge is verified carriers + verified brokers + scam reduction for small trucks.
2. **Start with one sharp customer segment.** Recommended first ICP: box-truck owner-operators and small carriers who need legitimate loads and faster pay.
3. **Make verification the moat.** DOT/MC lookup, ID match, insurance upload, broker payment history, and manual admin review should be core.
4. **Add lane alerts early.** Drivers should save lanes/equipment/rate targets and get notified when a matching verified load appears.
5. **Avoid too many monetization ideas at once.** Start with simple carrier subscription + optional quick-pay/revenue share tests.

## Build direction

1. Keep the current static MVP for demo/sales calls.
2. Next version should be a database-backed app with roles: carrier, broker/shipper, admin.
3. Recommended stack for speed: Next.js or Remix + PostgreSQL/Supabase + Stripe + an identity verification provider.
4. Add admin moderation before public launch.
5. Use a real verification provider/API where possible, but keep manual review as fallback.

## MVP screens to build next

- Carrier onboarding + verification checklist
- Broker onboarding + load posting
- Load detail page
- Offer / booking flow
- Admin verification queue
- Saved lane alerts
- Driver scorecard

## Verification module detail

- **Carrier:** DOT/MC, identity, phone/email, company address, dispatch contact.
- **Truck/equipment:** 15–26 ft box truck, liftgate, ramp, cargo van, truck+trailer, hotshot, equipment photos.
- **Insurance:** cargo/liability certificate, coverage amount, expiration date, review status.
- **Broker/payment trust:** broker identity, payment grade, disputes, average days-to-pay, quick-pay availability.
- **Saved lane alerts:** home area, destination, equipment, minimum rate/mi, quick-pay/no-touch/liftgate preferences.

This should become the core trust engine: match the right verified driver to the right verified load, then alert them fast.

## Customer ratings + scam reduction

- Customers/brokers/shippers should pay **$9.99/month** so posting loads has accountability and is not a free spam channel.
- Add a customer rating score after each completed job:
  - load accuracy
  - loading/unloading readiness
  - communication
  - payment trust
  - scam/risk flags
- Scam minimizers:
  - verified identity before posting
  - verified payment method before booking
  - no pressure to move off-platform
  - mismatched contact info triggers admin review
  - repeated disputes reduce visibility or suspend account

## Fun content / marketing angle

Use entertainment to teach the trust problem:

- “Should’ve gone with Relocation Manager” for load-detail failures.
- “POV: you accepted the load without details” for funny reels.
- “Red flag load post” series for scam education.
- “Equipment mismatch of the week” for 15–26 ft, liftgate, ramp, truck+trailer education.

Use licensed stock, original footage, or user-submitted clips with permission. Avoid random copyrighted crash clips and never joke about injuries.
