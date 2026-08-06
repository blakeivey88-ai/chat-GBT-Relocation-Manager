import test from 'node:test';
import assert from 'node:assert/strict';

import { listAuditEvents, recordAuthAuditEvent } from '../functions/lib/audit.js';

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

  async list({ prefix = '' } = {}) {
    return {
      keys: [...this.values.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((name) => ({ name })),
      cursor: '',
      list_complete: true,
    };
  }
}

async function recordOne(env, input) {
  await recordAuthAuditEvent(env, {
    actionType: 'account.login_restricted',
    outcome: 'rejected',
    reasonCode: 'account_restricted',
    ...input,
  });
  const [event] = await listAuditEvents(env);
  return event;
}

test('records an explicit production environment binding', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv(), ENVIRONMENT: 'Production' };
  const event = await recordOne(env, { userId: 'usr_customer_account' });
  assert.deepEqual(event.meta.provenance, {
    environment: 'production',
    origin: 'customer',
    dataClass: 'operational',
  });
});

test('marks a non-production Cloudflare preview branch as preview, not production', async () => {
  const env = {
    RELOCATION_MANAGER_LEADS: new MemoryKv(),
    CF_PAGES_BRANCH: 'reconcile/category2-tests-20260805',
    CF_PAGES_PRODUCTION_BRANCH: 'main',
  };
  const event = await recordOne(env, { userId: 'usr_customer_account' });
  assert.equal(event.meta.provenance.environment, 'preview');
});

test('falls back to unknown when no environment metadata is present', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv() };
  const event = await recordOne(env, { userId: 'usr_customer_account' });
  assert.deepEqual(event.meta.provenance, {
    environment: 'unknown',
    origin: 'customer',
    dataClass: 'operational',
  });
});

test('trusts a Cloudflare production branch that matches the configured production branch', async () => {
  const env = {
    RELOCATION_MANAGER_LEADS: new MemoryKv(),
    CF_PAGES_BRANCH: 'main',
    CF_PAGES_PRODUCTION_BRANCH: 'main',
  };
  const event = await recordOne(env, { userId: 'usr_customer_account' });
  assert.equal(event.meta.provenance.environment, 'production');
});

test('marks release-smoke auth events as synthetic without retaining a run identifier', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv(), ENVIRONMENT: 'production' };
  const event = await recordOne(env, {
    userId: 'smoke_0874118_20260728233000_deadbeef_restricted',
  });
  assert.deepEqual(event.meta.provenance, {
    environment: 'production',
    origin: 'release-smoke',
    dataClass: 'synthetic',
  });
  assert.equal(JSON.stringify(event.meta).includes('0874118'), false);
});

test('marks ordinary auth events as operational customer activity', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv(), ENVIRONMENT: 'production' };
  const event = await recordOne(env, { userId: 'usr_customer_account' });
  assert.deepEqual(event.meta.provenance, {
    environment: 'production',
    origin: 'customer',
    dataClass: 'operational',
  });
});
