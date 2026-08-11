import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet, onRequestPost } from '../functions/api/communication.js';
import { createSession, upsertAccount } from '../functions/api/_auth.js';

class MemoryKv {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) { return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })) }; }
}

function account(userId, type) {
  return {
    userId,
    email: `${userId}@example.com`,
    name: userId,
    company: `${userId} LLC`,
    type,
    emailVerifiedAt: '2026-08-10T12:00:00.000Z',
    profileComplete: true,
    paymentStatus: /shipper/i.test(type) ? 'paid_shipper' : 'paid_driver',
    subscriptionStatus: 'active',
    carrierVerifiedAt: /shipper/i.test(type) ? '' : '2026-08-10T12:00:00.000Z',
  };
}

async function session(env, value) {
  await upsertAccount(env, value);
  return createSession(env, value.userId);
}

function request(sessionToken, body) {
  const csrf = 'load-message-csrf';
  return new Request('https://relocationmanagerusa.com/api/communication', {
    method: 'POST',
    headers: { origin: 'https://relocationmanagerusa.com', cookie: `rm_session=${sessionToken}; rm_csrf=${csrf}`, 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify({ ...body, csrfToken: csrf }),
  });
}

test('accepted load messaging derives the exact shipper and carrier participants', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv() };
  const shipper = account('usr_message_shipper', 'Customer / shipper');
  const carrier = account('usr_message_carrier', 'Independent driver');
  const outsider = account('usr_message_outsider', 'Independent driver');
  const shipperSession = await session(env, shipper);
  const carrierSession = await session(env, carrier);
  const outsiderSession = await session(env, outsider);
  await env.RELOCATION_MANAGER_LEADS.put('marketplace:loads:v1', JSON.stringify([{
    id: 'load-message-test', status: 'accepted', postedByUserId: shipper.userId, acceptedByUserId: carrier.userId,
  }]));

  const sent = await onRequestPost({
    request: request(carrierSession, { action: 'send', type: 'load', loadId: 'load-message-test', body: 'Pickup time confirmed.' }),
    env,
  });
  const sentBody = await sent.json();
  assert.equal(sent.status, 200, JSON.stringify(sentBody));
  assert.deepEqual(sentBody.thread.members.sort(), [carrier.userId, shipper.userId].sort());

  const visible = await onRequestGet({ request: new Request('https://relocationmanagerusa.com/api/communication', { headers: { cookie: `rm_session=${shipperSession}` } }), env });
  const visibleBody = await visible.json();
  assert.equal(visibleBody.hub.threads[0].messages[0].body, 'Pickup time confirmed.');

  const denied = await onRequestPost({
    request: request(outsiderSession, { action: 'send', type: 'load', loadId: 'load-message-test', participants: [carrier.userId], body: 'Add me.' }),
    env,
  });
  assert.equal(denied.status, 403);
});

test('load conversations reject unaccepted loads and injected participants', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv() };
  const shipper = account('usr_pending_shipper', 'Customer / shipper');
  const carrier = account('usr_pending_carrier', 'Independent driver');
  const outsider = account('usr_pending_outsider', 'Independent driver');
  const shipperSession = await session(env, shipper);
  await session(env, carrier);
  await session(env, outsider);
  await env.RELOCATION_MANAGER_LEADS.put('marketplace:loads:v1', JSON.stringify([{
    id: 'load-open-message-test', status: 'open', postedByUserId: shipper.userId,
  }, {
    id: 'load-accepted-message-test', status: 'accepted', postedByUserId: shipper.userId, acceptedByUserId: carrier.userId,
  }]));

  const pending = await onRequestPost({ request: request(shipperSession, { action: 'send', type: 'load', loadId: 'load-open-message-test', body: 'Not accepted yet.' }), env });
  assert.equal(pending.status, 403);
  const injected = await onRequestPost({ request: request(shipperSession, { action: 'send', type: 'load', loadId: 'load-accepted-message-test', participants: [outsider.userId], body: 'Wrong participant.' }), env });
  assert.equal(injected.status, 403);
});

test('communication mutations require a matching CSRF token', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv() };
  const carrier = account('usr_csrf_carrier', 'Independent driver');
  const carrierSession = await session(env, carrier);
  const response = await onRequestPost({
    request: new Request('https://relocationmanagerusa.com/api/communication', {
      method: 'POST',
      headers: { cookie: `rm_session=${carrierSession}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'send', body: 'No CSRF token.' }),
    }),
    env,
  });
  assert.equal(response.status, 403);
});

test('mobile menu meets the 44px touch target floor', async () => {
  const { readFile } = await import('node:fs/promises');
  const [css, member] = await Promise.all([
    readFile(new URL('../dist/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../dist/member.html', import.meta.url), 'utf8'),
  ]);
  assert.match(css, /\.menu-btn\s*\{[^}]*min-height:\s*44px/s);
  assert.match(member, /styles\.css\?v=20260811-bid-room-mvp-1/);
});
