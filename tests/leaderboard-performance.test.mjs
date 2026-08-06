import test from 'node:test';
import assert from 'node:assert/strict';

import { readVerifiedCompletedCounts } from '../functions/lib/load-history.js';
import { onRequestGet as leaderboardGet } from '../functions/api/leaderboard.js';
import { createSession, userIdKey } from '../functions/api/_auth.js';
import { SqliteD1 } from './helpers/sqlite-d1.mjs';

// Counts prepare() calls so a test can prove the number of database queries is
// bounded (constant) regardless of how many accounts are ranked.
class CountingD1 extends SqliteD1 {
  constructor() {
    super();
    this.prepareCount = 0;
    // The bounded-query proof only needs load_history rows; skip the accounts
    // foreign key so we don't have to seed the full accounts table.
    this.database.exec('PRAGMA foreign_keys = OFF');
  }
  prepare(sql) {
    this.prepareCount += 1;
    return super.prepare(sql);
  }
}

class CountingKv {
  constructor() {
    this.values = new Map();
    this.gets = 0;
  }
  async get(key) {
    this.gets += 1;
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
}

class MemoryKv {
  constructor() {
    this.values = new Map();
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
  async list({ prefix = '', cursor } = {}) {
    const names = [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
    const start = Number(cursor || 0);
    const page = names.slice(start, start + 1000);
    const next = start + 1000 < names.length ? String(start + 1000) : undefined;
    return { keys: page.map((name) => ({ name })), cursor: next };
  }
}

async function seedHistory(d1, id, userId, eventType, verified) {
  await d1
    .prepare(
      `INSERT INTO load_history (load_history_id, user_id, load_id, event_type, verified, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, 'load-x', eventType, verified, '2026-07-01T00:00:00.000Z')
    .run();
}

function member(userId) {
  return {
    userId,
    email: `${userId}@example.invalid`,
    emailVerifiedAt: '2026-07-24T00:00:00.000Z',
    profileComplete: true,
    name: userId,
    company: `${userId} LLC`,
    role: 'Owner-Operator',
    type: 'Independent driver / self-insured - $29.99/mo',
    subscriptionPriceCents: 2999,
    paymentStatus: 'paid_driver',
    subscriptionStatus: 'active',
    carrierVerifiedAt: '2026-07-24T00:00:00.000Z',
  };
}

function headers(session) {
  return { origin: 'https://relocationmanagerusa.com', cookie: `rm_session=${session}` };
}

test('verified-completed aggregation uses one bounded D1 query for 10, 100, and 1000 accounts', async () => {
  const d1 = new CountingD1();
  const env = { RELOCATION_MANAGER_DB: d1 };
  await seedHistory(d1, 'a1', 'usr_a', 'completed', 1);
  await seedHistory(d1, 'a2', 'usr_a', 'completed', 1);
  await seedHistory(d1, 'a3', 'usr_a', 'completed', 1);
  await seedHistory(d1, 'b1', 'usr_b', 'completed', 1);
  await seedHistory(d1, 'x1', 'usr_a', 'completed', 0); // unverified -> excluded
  await seedHistory(d1, 'x2', 'usr_a', 'accepted', 1); // not completed -> excluded

  for (const n of [10, 100, 1000]) {
    const ids = Array.from({ length: n }, (_, i) => `usr_${i}`);
    ids[0] = 'usr_a';
    ids[1] = 'usr_b';
    const before = d1.prepareCount;
    const { counts, complete } = await readVerifiedCompletedCounts(env, ids);
    assert.equal(
      d1.prepareCount - before,
      1,
      `N=${n}: expected exactly one D1 query, used ${d1.prepareCount - before}`,
    );
    assert.equal(complete, true); // D1 is authoritative for every requested user
    assert.equal(counts.get('usr_a'), 3); // lifetime verified+completed total
    assert.equal(counts.get('usr_b'), 1);
    assert.equal(counts.has('usr_5'), false); // no history -> authoritative zero
  }
});

test('KV fallback verified-count reads are bounded to kvScanLimit, not one per account', async () => {
  const kv = new CountingKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const ids = Array.from({ length: 1000 }, (_, i) => `usr_${i}`);
  const { complete } = await readVerifiedCompletedCounts(env, ids, { kvScanLimit: 200 });
  assert.ok(kv.gets <= 200, `expected <= 200 KV reads, got ${kv.gets}`);
  assert.equal(complete, false); // could not scan all 1000 -> not authoritative
});

test('KV fallback never reports an unscanned account (the 201st) as a genuine zero', async () => {
  const kv = new CountingKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  // 201 users; the LAST one (beyond a 200 scan budget) genuinely has verified
  // completed history. The bounded scan must not visit it and must not claim 0.
  const ids = Array.from({ length: 201 }, (_, i) => `usr_${String(i).padStart(3, '0')}`);
  const unscanned = ids[200];
  await kv.put(
    `load-history:${unscanned}:v1`,
    JSON.stringify([
      { userId: unscanned, loadId: 'l1', eventType: 'completed', verified: true, occurredAt: '2026-07-01T00:00:00.000Z' },
    ]),
  );
  const { counts, complete } = await readVerifiedCompletedCounts(env, ids, { kvScanLimit: 200 });
  assert.equal(complete, false); // caller must fail closed, not publish zeros
  assert.equal(counts.get(unscanned), undefined); // UNKNOWN, never 0
  assert.notEqual(counts.get(unscanned), 0);
});

test('leaderboard fails closed (503) instead of fabricating zeros when the KV fallback cannot scan every account', async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  // More entitled accounts than the fallback scan budget, with no D1.
  for (let i = 0; i < 260; i++) {
    const account = member(`usr_x_${String(i).padStart(3, '0')}`);
    await kv.put(userIdKey(account.userId), JSON.stringify(account));
  }
  const viewer = member('usr_viewer');
  await kv.put(userIdKey(viewer.userId), JSON.stringify(viewer));
  const session = await createSession(env, viewer.userId);
  const res = await leaderboardGet({
    request: new Request('https://relocationmanagerusa.com/api/leaderboard', { headers: headers(session) }),
    env,
  });
  const body = await res.json();
  assert.equal(res.status, 503, JSON.stringify(body));
  assert.equal(body.ok, false);
  assert.equal(body.reason, 'history_unavailable');
});

test('leaderboard returns a bounded, stable, paginated result set', async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  for (let i = 0; i < 120; i++) {
    const account = member(`usr_p_${String(i).padStart(3, '0')}`);
    await kv.put(userIdKey(account.userId), JSON.stringify(account));
  }
  const viewer = member('usr_viewer');
  await kv.put(userIdKey(viewer.userId), JSON.stringify(viewer));
  const session = await createSession(env, viewer.userId);

  const page1Res = await leaderboardGet({
    request: new Request('https://relocationmanagerusa.com/api/leaderboard', { headers: headers(session) }),
    env,
  });
  const page1 = await page1Res.json();
  assert.equal(page1Res.status, 200, JSON.stringify(page1));
  assert.equal(page1.pageSize, 50);
  assert.equal(page1.totalProfiles, 120); // 121 accounts minus the owner
  assert.equal(page1.totalPages, 3);
  assert.equal(page1.profiles.length, 50); // bounded, not all 120
  assert.equal(page1.hasMore, true);

  const page3Res = await leaderboardGet({
    request: new Request('https://relocationmanagerusa.com/api/leaderboard?page=3', { headers: headers(session) }),
    env,
  });
  const page3 = await page3Res.json();
  assert.equal(page3.profiles.length, 20); // 120 - 100
  assert.equal(page3.hasMore, false);

  // Stable pagination: pages are disjoint and repeatable.
  const firstIds = new Set(page1.profiles.map((p) => p.userId));
  assert.ok(page3.profiles.every((p) => !firstIds.has(p.userId)));
  const page1Again = await (
    await leaderboardGet({
      request: new Request('https://relocationmanagerusa.com/api/leaderboard', { headers: headers(session) }),
      env,
    })
  ).json();
  assert.deepEqual(page1Again.profiles.map((p) => p.userId), page1.profiles.map((p) => p.userId));

  // Truthful zero metrics preserved for accounts with no verified history.
  assert.ok(page1.profiles.every((p) => p.verifiedLoads === 0 && p.score === 0));
});

test('every peer past the first page stays reachable through pagination', async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const expected = new Set();
  for (let i = 0; i < 120; i++) {
    const account = member(`usr_r_${String(i).padStart(3, '0')}`);
    expected.add(account.userId);
    await kv.put(userIdKey(account.userId), JSON.stringify(account));
  }
  const viewer = member('usr_reach_viewer');
  await kv.put(userIdKey(viewer.userId), JSON.stringify(viewer));
  const session = await createSession(env, viewer.userId);

  const seen = new Set();
  let page = 1;
  let totalPages = 1;
  do {
    const res = await leaderboardGet({
      request: new Request(`https://relocationmanagerusa.com/api/leaderboard?page=${page}`, {
        headers: headers(session),
      }),
      env,
    });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    totalPages = body.totalPages;
    for (const p of body.profiles) seen.add(p.userId);
    page += 1;
  } while (page <= totalPages);

  // Full reachability: every expected peer appears on some page, none dropped.
  assert.equal(seen.size, expected.size);
  for (const id of expected) assert.ok(seen.has(id), `peer ${id} was unreachable`);

  // And at least one peer is only reachable beyond page 1.
  const page1 = await (
    await leaderboardGet({
      request: new Request('https://relocationmanagerusa.com/api/leaderboard?page=1', { headers: headers(session) }),
      env,
    })
  ).json();
  const firstPageIds = new Set(page1.profiles.map((p) => p.userId));
  assert.ok([...expected].some((id) => !firstPageIds.has(id)));
});
