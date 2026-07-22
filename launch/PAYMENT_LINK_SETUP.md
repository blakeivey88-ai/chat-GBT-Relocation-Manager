# Payment Link Setup — Stage 1

Goal: collect real paid intent without building full billing infrastructure yet.

## Live Stripe Payment Links

| Plan | Price | Stripe Payment Link |
| --- | ---: | --- |
| Shippers Plan | $9.99/month | https://buy.stripe.com/fZu4gA5B06AH6UWepqaVa00 |
| Independent Driver | $29.99/month | https://buy.stripe.com/28EdRa9RgcZ53IKbdeaVa01 |
| Fleet Starter | $59.99/month | https://buy.stripe.com/3cI4gA8Nc6AH6UW6WYaVa02 |
| Fleet Growth | $79.99/month | https://buy.stripe.com/00w00kfbAcZ52EG5SUaVa04 |
| Fleet Pro | $149.99/month | https://buy.stripe.com/3cIcN69RgaQXbbcftuaVa03 |

## Current checkout settings

The new public links are active and separate by plan. They collect:

- customer full name
- business name
- billing address
- phone number
- email, through Stripe checkout

They do **not** currently enable:

- automatic tax
- promotion codes
- free trials
- terms-of-service checkbox
- limited-use checkout caps

## Recommended follow-up

- Add privacy policy and terms placeholders before heavier ad traffic.
- Connect payment success events to a lead tracker or CRM.
- Add onboarding questions after payment: freight/equipment type, pickup regions, lane preferences, expected load volume, authority/insurance details when relevant.

## Stripe webhook sync

When ready to automate paid-account activation, set this Cloudflare Pages secret:

- `STRIPE_WEBHOOK_SECRET`

Then point Stripe webhooks at:

- `/api/stripe-webhook`

Recommended events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.paid`

This updates the matching account record with:

- payment status
- plan label
- Stripe customer/session IDs
- paid timestamp

It also updates the lead record when a matching email index exists.

If no waitlist lead exists yet, the webhook now creates a paid lead record from the checkout session so payment success still gets tagged.

For Stripe Payment Links, set the post-checkout redirect to:

- `https://relocationmanagerusa.com/success.html`

That page immediately forwards to `/thank-you.html` with the query string preserved.

## Important wording

Do not promise live load-board access yet. Say:

“Stage 1 early access includes manual review, verified profile setup, and priority onboarding as Relocation Manager opens its first lanes.”
