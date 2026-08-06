import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPut } from '../functions/api/account.js';
import { onRequestGet as leaderboardGet } from '../functions/api/leaderboard.js';
import { createSession, userIdKey } from '../functions/api/_auth.js';

class MemoryKv {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async list({ prefix = '', cursor } = {}) {
    const names = [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
    const start = Number(cursor || 0);
    return { keys: names.slice(start, start + 1000).map((name) => ({ name })), cursor: undefined };
  }
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
    note: 'TOP_SECRET_NOTE_LOCATION',
    laneAlerts: [{ origin: 'TOP_SECRET_ALERT_ORIGIN', equipment: 'TOP_SECRET_ALERT_EQUIPMENT' }],
    recentLoads: [{ origin: 'TOP_SECRET_LOAD_ORIGIN', equipment: 'TOP_SECRET_LOAD_EQUIPMENT' }],
    plannedTrips: [{ origin: 'TOP_SECRET_TRIP_ORIGIN', equipment: 'TOP_SECRET_TRIP_EQUIPMENT' }],
    recentRequests: [{ from: 'TOP_SECRET_REQUEST_ORIGIN', equipment: 'TOP_SECRET_REQUEST_EQUIPMENT' }],
    tags: ['TOP_SECRET_TAG'],
    subscriptionStatus: 'active',
    carrierVerifiedAt: '2026-07-24T00:00:00.000Z',
  };
}

function headers(session, csrf = '') {
  return {
    origin: 'https://relocationmanagerusa.com',
    cookie: `rm_session=${session}${csrf ? `; rm_csrf=${csrf}` : ''}`,
    ...(csrf ? { 'content-type': 'application/json', 'x-csrf-token': csrf } : {}),
  };
}

test('member-edited activity cannot fabricate public verified-load or trust evidence', async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const author = member('usr_self_authored_activity');
  const viewer = member('usr_independent_viewer');
  await kv.put(userIdKey(author.userId), JSON.stringify(author));
  await kv.put(userIdKey(viewer.userId), JSON.stringify(viewer));
  const authorSession = await createSession(env, author.userId);
  const viewerSession = await createSession(env, viewer.userId);
  const csrf = 'leaderboard-integrity-csrf';
  const selfAuthored = Array.from({ length: 12 }, (_, i) => ({
    title: `Self-authored load ${i + 1}`,
    completedAt: '2026-07-24T00:00:00.000Z',
    score: 5,
  }));

  const save = await onRequestPut({
    request: new Request('https://relocationmanagerusa.com/api/account', {
      method: 'PUT', headers: headers(authorSession, csrf),
      body: JSON.stringify({
        action: 'save',
        recentLoads: selfAuthored,
        plannedTrips: selfAuthored,
        laneAlerts: selfAuthored,
        customerRatings: selfAuthored,
        verifiedTransactions: selfAuthored,
        activePickups: [{
          id: 'fabricated-pickup',
          loadId: 'another-members-load',
          status: 'Delivered',
          serverAuthorized: true,
        }],
      }),
    }), env,
  });
  assert.equal(save.status, 200, await save.text());
  const storedAuthor = JSON.parse(await kv.get(userIdKey(author.userId)));
  assert.deepEqual(storedAuthor.activePickups, []);
  assert.deepEqual(storedAuthor.verifiedTransactions, []);

  const response = await leaderboardGet({
    request: new Request('https://relocationmanagerusa.com/api/leaderboard', { headers: headers(viewerSession) }), env,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const profile = body.profiles.find((item) => item.userId === author.userId);
  assert.ok(profile, JSON.stringify(body));
  assert.equal(profile.verifiedLoads, 0);
  assert.equal(profile.verifiedMiles, 0);
  assert.equal(profile.score, 0);
  assert.equal(profile.reviewCount, 0);
  assert.equal(profile.insuranceVerification, 'Verified');
  assert.equal(profile.authorityVerification, 'Verified');
  assert.ok(!profile.badgesEarned.includes('Public score unlocked'));

  const oldCompletions = Array.from({ length: 10 }, (_, index) => ({
    id: `old-completion-${index}`,
    userId: author.userId,
    loadId: `old-load-${index}`,
    eventType: 'completed',
    occurredAt: '2025-01-15T00:00:00.000Z',
    verified: true,
  }));
  await kv.put(
    `load-history:${author.userId}:v1`,
    JSON.stringify(oldCompletions),
  );
  const oldHistoryResponse = await leaderboardGet({
    request: new Request('https://relocationmanagerusa.com/api/leaderboard', {
      headers: headers(viewerSession),
    }),
    env,
  });
  const oldHistoryBody = await oldHistoryResponse.json();
  const oldHistoryProfile = oldHistoryBody.profiles.find(
    (item) => item.userId === author.userId,
  );
  assert.equal(oldHistoryProfile.verifiedLoads, 10);
  assert.equal(oldHistoryProfile.performance90Days.verifiedLoads, 0);
});

// NOTE: The candidate file also contained a `checkoutPlan` (403) case. It asserts a
// pricing/billing lock in account.js that is intentionally NOT part of unit F —
// pricing is on hold and account.js checkoutPlan behavior is unchanged. Excluded
// here to keep F scoped to leaderboard integrity; revisit with the pricing unit.

test('leaderboard peers expose only public identity and verified performance fields', async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const peer = {
    ...member('usr_private_peer'),
    phone: '555-0100',
    insuranceProvider: 'Private Insurance Co',
    insurancePolicyLast4: '4242',
    insuranceExpiration: '2027-01-01',
    insuranceDocumentUrl: 'https://private.example.invalid/proof.pdf',
    mc_dot: 'USDOT123456',
    paymentMethod: 'bank-account-ending-1234',
    subscriptionAccess: 'claim_post',
    loadAccess: 'claim_post',
    subscriptionCurrentPeriodEnd: '2027-01-01T00:00:00.000Z',
    subscriptionPriceCents: 2999,
    paymentStatus: 'paid_driver',
  };
  const viewer = member('usr_private_peer_viewer');
  await kv.put(userIdKey(peer.userId), JSON.stringify(peer));
  await kv.put(userIdKey(viewer.userId), JSON.stringify(viewer));
  const session = await createSession(env, viewer.userId);
  const response = await leaderboardGet({
    request: new Request('https://relocationmanagerusa.com/api/leaderboard', {
      headers: headers(session),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const exposed = body.profiles.find((item) => item.userId === peer.userId);
  assert.ok(exposed, JSON.stringify(body));
  for (const key of [
    'email', 'phone', 'insuranceProvider', 'insurancePolicyLast4',
    'insuranceExpiration', 'insuranceDocumentUrl', 'paymentMethod',
    'paymentStatus', 'subscriptionStatus', 'subscriptionAccess', 'loadAccess',
    'subscriptionCurrentPeriodEnd', 'subscriptionPriceCents', 'paidAt', 'planLabel',
    'communicationPrivacy', 'type',
  ]) {
    assert.equal(Object.hasOwn(exposed, key), false, `peer leaked ${key}`);
  }
  assert.equal(exposed.company, peer.company);
  assert.equal(exposed.mc_dot, peer.mc_dot);
  assert.doesNotMatch(JSON.stringify(exposed), /TOP_SECRET_/);
  const allowed = new Set([
    'userId', 'name', 'company', 'username', 'role', 'mc_dot', 'city', 'state',
    'equipmentType', 'equipmentTypes', 'avatarUrl', 'logoUrl', 'bulletinColor',
    'showLanguagesSpoken', 'languagesSpoken', 'languagesSpokenLabel', 'roleLabel',
    'score', 'metroArea', 'region', 'operatingRadiusMiles', 'serviceArea',
    'primaryEquipment', 'verifiedLoads', 'verifiedMiles', 'onTimePickupPct',
    'onTimeDeliveryPct', 'claimFreePct', 'cancellationPct', 'repeatCustomerPct',
    'currentSuccessfulLoadStreak', 'bestSuccessfulLoadStreak', 'performance90Days',
    'memberSince', 'insuranceVerification', 'authorityVerification', 'badgesEarned',
    'reviewCount', 'reviewAverage',
  ]);
  assert.deepEqual(
    Object.keys(exposed).filter((key) => !allowed.has(key)),
    [],
    `unexpected peer keys: ${Object.keys(exposed).filter((key) => !allowed.has(key)).join(', ')}`,
  );
});
