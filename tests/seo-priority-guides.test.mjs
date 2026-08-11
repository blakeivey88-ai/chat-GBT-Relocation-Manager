import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = [
  ['how-to-move-to-another-state', /interstate moving checklist/i, /fmcsa\.dot\.gov\/protect-your-move/],
  ['how-to-load-a-moving-truck', /load a moving truck safely/i, /rated tie-down points/i],
];

for (const [slug, intent, evidence] of pages) {
  test(`${slug} provides query-matched, source-backed guidance`, async () => {
    const html = await readFile(new URL(`../dist/knowledge/${slug}.html`, import.meta.url), 'utf8');
    assert.match(html, intent);
    assert.match(html, evidence);
    assert.match(html, /<meta name="description" content=".{90,170}"/i);
    assert.match(html, /<link rel="canonical" href="https:\/\/relocationmanagerusa\.com\/knowledge\//i);
    assert.match(html, /"dateModified":"2026-08-10"/);
    assert.doesNotMatch(html, /Use this advice as a starting point/);
  });
}
