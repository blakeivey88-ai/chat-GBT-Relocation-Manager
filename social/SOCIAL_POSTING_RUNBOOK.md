# Social Posting Runbook - Relocation Manager

## Goal

Keep Leia ready to publish launch content without hunting for copy, links, or the next action.

## X posting lane

Use the OpenTweet lane when `OPENTWEET_API_KEY` is present in the active shell.

### Current X launch text

`Verified freight matching for shippers, drivers & fleets. Relocation Manager is live with the first launch page for box trucks, cargo vans, hotshots, and truck + trailer operators. Better lanes. Less scams. More work. https://relocationmanagerusa.com`

### Publish command

```bash
cd /Users/blakeivey/.openclaw/workspace/relocation-manager
node scripts/post-x-launch.mjs
```

### Before posting

- Confirm the text is under X length limits.
- Confirm the landing page URL is live.
- Confirm the account has remaining posting capacity in OpenTweet.

## Instagram posting lane

Instagram can use the live browser lane if the session is already signed in.

### Login identity

- Email: `blakeivey87@icloud.com`
- Handle: `@Relocationmanus`

### Browser path

1. Open the signed-in browser session for Instagram.
2. Confirm the profile URL is `https://www.instagram.com/relocationmanagerusa/`.
3. Check that the creator/business profile is active.
4. Update the bio if needed.
5. Create the post from the browser session.
6. Save or note the published URL in the workspace.

### If the session is not signed in

- Use the email above to recover the account in the browser.
- Do not paste the password into chat.
- If 2FA is requested, enter it directly in the browser session.

### Current approved bio

`Verified freight matching for shippers, drivers & fleets.`
`Built for carriers. Trusted by shippers.`
`Early access opening soon 👇`

### Current launch caption

Verified freight matching for shippers, drivers & fleets.

Relocation Manager is building a safer load marketplace for:
- 15-26 ft box trucks
- liftgate/ramp trucks
- truck + trailer operators
- small carriers looking for real work

We’re starting with verified users, broker/payment trust, customer ratings, and saved lane alerts that help drivers find more jobs.

Less scams. Better lanes. More work.

### Before posting

- Update the bio first.
- Keep the profile image consistent with the approved truck/eagle avatar.
- Do not claim live freight inventory if the post is only about launch progress.
- If the browser lane is open, post from there instead of waiting on another connector.

## Working rule

If something blocks posting, document the blocker in Leia status and keep the post text ready anyway.
