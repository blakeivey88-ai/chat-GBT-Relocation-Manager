import test from 'node:test';
import assert from 'node:assert/strict';

import { readAccountByUserId, upsertAccount } from '../functions/api/_auth.js';
import { onRequestPost } from '../functions/api/stripe-webhook.js';

class MemoryKv {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) {
    return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })), cursor: '', list_complete: true };
  }
}

async function signedRequest(event, secret) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const digest = [...new Uint8Array(signed)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return new Request('https://relocationmanagerusa.com/api/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${timestamp},v1=${digest}`, 'content-type': 'application/json' },
    body: payload,
  });
}

async function runCheckout({ amount, paymentStatus, eventType = 'checkout.session.completed', type, checkoutPlan = '' }) {
  const kv = new MemoryKv();
  const secret = 'stripe-regression-secret';
  const userId = `usr_${amount}_${eventType.replaceAll('.', '_')}`;
  const email = `${userId}@example.com`;
  await upsertAccount({ RELOCATION_MANAGER_LEADS: kv }, {
    userId, email, name: 'Stripe Regression', type, checkoutPlan,
    paymentStatus: 'unpaid_waitlist', subscriptionStatus: 'unpaid',
  });
  const event = {
    id: `evt_${userId}`,
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data: { object: {
      id: `cs_${userId}`,
      client_reference_id: userId,
      customer_details: { email },
      amount_total: amount,
      payment_status: paymentStatus,
      metadata: { user_id: userId, profile_type: type },
    } },
  };
  const env = { RELOCATION_MANAGER_LEADS: kv, STRIPE_WEBHOOK_SECRET: secret };
  const response = await onRequestPost({ request: await signedRequest(event, secret), env });
  return { response, body: await response.json(), account: await readAccountByUserId(env, userId) };
}

test('pending checkout never receives paid state, timestamp, or tags', async () => {
  const result = await runCheckout({ amount: 2999, paymentStatus: 'unpaid', type: 'Independent driver / self-insured - $29.99/mo' });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.account.paymentStatus, 'pending');
  assert.equal(result.account.subscriptionStatus, 'incomplete');
  assert.equal(result.account.paidAt, '');
  assert.ok(result.account.tags.includes('payment-pending'));
  assert.ok(!result.account.tags.includes('paid-member'));
});

test('async payment failure removes paid entitlement and marks billing attention', async () => {
  const result = await runCheckout({ amount: 2999, paymentStatus: 'unpaid', eventType: 'checkout.session.async_payment_failed', type: 'Independent driver / self-insured - $29.99/mo' });
  assert.equal(result.account.paymentStatus, 'failed');
  assert.equal(result.account.paidAt, '');
  assert.ok(result.account.tags.includes('payment-failed'));
  assert.ok(result.account.tags.includes('billing-attention'));
  assert.ok(!result.account.tags.includes('paid-member'));
});

test('$189.99 checkout assigns Dispatcher and Broker entitlement', async () => {
  const result = await runCheckout({ amount: 18999, paymentStatus: 'paid', type: 'Dispatcher / broker - $189.99/mo', checkoutPlan: 'dispatcher-broker' });
  assert.equal(result.account.paymentStatus, 'paid_dispatcher_broker');
  assert.equal(result.account.planLabel, 'Dispatcher & Broker');
  assert.equal(result.account.loadAccess, 'claim_post');
  assert.ok(result.account.tags.includes('dispatcher-broker'));
});

