#!/usr/bin/env node

/**
 * Publish the current Relocation Manager launch announcement to X via OpenTweet.
 *
 * Requirements:
 * - OPENTWEET_API_KEY must be set in the shell environment.
 * - The connected X account must have remaining posting capacity.
 *
 * Usage:
 *   node scripts/post-x-launch.mjs
 */

const apiKey = process.env.OPENTWEET_API_KEY;

if (!apiKey) {
  console.error('Missing OPENTWEET_API_KEY in the shell environment.');
  process.exit(1);
}

const post = {
  text: [
    'Verified freight matching for shippers, drivers & fleets.',
    'Relocation Manager is live with the first launch page for box trucks, cargo vans, hotshots, and truck + trailer operators.',
    'Better lanes. Less scams. More work.',
    'https://relocationmanagerusa.com',
  ].join(' '),
  publish_now: true,
};

const response = await fetch('https://opentweet.io/api/v1/posts', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(post),
});

const body = await response.text();

if (!response.ok) {
  console.error(`OpenTweet publish failed (${response.status}):`);
  console.error(body);
  process.exit(response.status);
}

console.log(body);
