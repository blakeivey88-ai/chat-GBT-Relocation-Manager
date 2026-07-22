# Relocation Manager

Verified loads and trucking work for box trucks, cargo vans, hotshots, and small carriers.

## Current state

Imported from Blake's Desktop prototype and upgraded into a cleaner static MVP with a lightweight persisted profile layer.

## Files

- `index.html` — upgraded static app shell
- `styles.css` — responsive design system
- `app.js` — prototype data, routing, filters, forms, account sync, and roadmap rendering
- `prototype-original.html` — untouched backup of the original imported prototype
- `NOTES.md` — product notes
- `SUGGESTIONS.md` — upgrade recommendations

## Run locally

Open `index.html` directly in a browser, or run:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/relocation-manager/` from the workspace root.

## Mission

Help small trucking businesses in America get more legitimate work through verified loads, verified members, better cash-flow options, and reputation-based driver tiers.

## Next build steps

1. Harden the account/session flow into full auth.
2. Move profile data from KV into a proper database.
3. Build carrier/broker verification workflow.
4. Add load posting, search, saved lane alerts, and booking flow.
5. Add admin review/moderation before allowing public listings.
