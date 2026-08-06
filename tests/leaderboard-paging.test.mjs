import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createLeaderboardLoader } from '../dist/leaderboard-paging.js';

test('a failed page-two request causes exactly one attempt and leaves a safe manual retry', async () => {
  const totalPages = 5;
  let loaded = 1; // page 1 already loaded
  let failPageTwo = true;
  const attempts = [];
  const hasMore = () => loaded < totalPages;
  const loadNextPage = async () => {
    const target = loaded + 1;
    attempts.push(target);
    if (target === 2 && failPageTwo) {
      return { ok: false, progressed: false, added: 0 };
    }
    loaded = target;
    return { ok: true, progressed: true, added: 50 };
  };
  const loader = createLeaderboardLoader({ hasMore, loadNextPage });

  const first = await loader.loadAll();
  // Exactly one attempt at the failing page — no retry loop, no 2000 spins.
  assert.deepEqual(attempts, [2]);
  assert.equal(first.pagesAttempted, 1);
  assert.equal(first.stoppedForError, true);
  assert.equal(first.complete, false);

  // Safe manual retry: once the transient failure clears, calling again resumes
  // from where it stopped and finishes.
  failPageTwo = false;
  const second = await loader.loadAll();
  assert.equal(loaded, totalPages);
  assert.equal(second.stoppedForError, false);
  assert.equal(second.complete, true);
  assert.deepEqual(attempts, [2, 2, 3, 4, 5]);
});

test('a no-progress page stops the loader instead of spinning', async () => {
  let calls = 0;
  const hasMore = () => true; // pretend the server keeps claiming more
  const loadNextPage = async () => {
    calls += 1;
    return { ok: true, progressed: false, added: 0 }; // ok but no new rows
  };
  const loader = createLeaderboardLoader({ hasMore, loadNextPage });
  const summary = await loader.loadAll();
  assert.equal(calls, 1); // stopped after one no-progress page
  assert.equal(summary.pagesAttempted, 1);
});

test('concurrent loadAll calls share a single in-flight run', async () => {
  const totalPages = 4;
  let loaded = 1;
  let calls = 0;
  const hasMore = () => loaded < totalPages;
  const loadNextPage = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 5));
    loaded += 1;
    return { ok: true, progressed: true, added: 50 };
  };
  const loader = createLeaderboardLoader({ hasMore, loadNextPage });
  const [a, b] = await Promise.all([loader.loadAll(), loader.loadAll()]);
  assert.equal(a, b); // same shared promise result, not two separate runs
  assert.equal(calls, 3); // pages 2,3,4 loaded once — concurrency did not double
});

test('member.html serves the explicit app.js client and the paging module', async () => {
  const html = await readFile(new URL('../dist/member.html', import.meta.url), 'utf8');
  assert.match(html, /src="app\.js\?/, 'member.html must serve the explicit app.js source');
  assert.doesNotMatch(html, /src="app\.min\.js/, 'member.html must not serve the stale app.min.js');
  assert.match(html, /leaderboard-paging\.js/, 'member.html must load the paging module');
});
