# Analytics Setup

## What is wired in

- Google Analytics 4 loader
- Microsoft Clarity loader
- Google Search Console verification meta tag support
- Bing Webmaster Tools verification meta tag support

## Build-time env vars

Set these before running the site generator:

- `RM_GA4_ID` → GA4 measurement ID like `G-XXXXXXXXXX`
- `RM_CLARITY_ID` → Clarity project ID
- `RM_GOOGLE_SITE_VERIFICATION` → Google Search Console verification token
- `RM_BING_SITE_VERIFICATION` → Bing Webmaster Tools verification token

## Notes

- GA4 and Clarity load only when IDs are present.
- Search Console and Bing require the verification tokens to be provided at build time so they can be rendered into the page head.
- After adding the IDs, rerun the site generator so the public pages include the live tags.

## Recommended next step

Use the free public knowledge center and city/state pages as the primary organic traffic engine, then measure:

- indexed pages
- impressions
- clicks
- click-through rate
- average position
- conversions from knowledge pages into paid signups
