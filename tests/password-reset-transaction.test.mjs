import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet, onRequestPost } from '../functions/api/account.js';
import { createPasswordResetToken, hashPassword, readAccountByUserId, readResetRecord, upsertAccount, verifyPassword } from '../functions/api/_auth.js';

class MemoryKv {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) {
    return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })), cursor: '', list_complete: true };
  }
}

async function fixture() {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv() };
  const userId = 'usr_reset_transaction';
  const oldPassword = 'Original-password-123';
  const password = await hashPassword(oldPassword);
  await upsertAccount(env, { userId, email: 'reset@example.com', name: 'Reset Test', type: 'Independent driver', passwordSalt: password.salt, passwordHash: password.hash });
  const token = await createPasswordResetToken(env, userId);
  return { env, userId, oldPassword, nextPassword: 'Replacement-password-456', token };
}

async function serverIssuedRequest(env, body) {
  const seed = await onRequestGet({ request: new Request('https://relocationmanagerusa.com/api/account'), env });
  const { csrfToken } = await seed.json();
  return new Request('https://relocationmanagerusa.com/api/account', {
    method: 'POST',
    headers: { origin: 'https://relocationmanagerusa.com', 'content-type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ ...body, csrfToken }),
  });
}

test('reset transaction changes password, consumes token, and signs member in', async () => {
  const f = await fixture();
  const request = await serverIssuedRequest(f.env, { action: 'reset-password', token: f.token, password: f.nextPassword });
  const response = await onRequestPost({ request, env: f.env });
  const body = await response.json();
  const account = await readAccountByUserId(f.env, f.userId);
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.match(response.headers.get('set-cookie') || '', /rm_session=/);
  assert.equal(await verifyPassword(f.nextPassword, account.passwordSalt, account.passwordHash), true);
  assert.equal(await verifyPassword(f.oldPassword, account.passwordSalt, account.passwordHash), false);
  assert.equal(await readResetRecord(f.env, f.token), '');
});

test('unissued CSRF token cannot reset a password', async () => {
  const f = await fixture();
  const request = new Request('https://relocationmanagerusa.com/api/account', {
    method: 'POST',
    headers: { origin: 'https://relocationmanagerusa.com', 'content-type': 'application/json', 'x-csrf-token': 'invented-token' },
    body: JSON.stringify({ action: 'reset-password', token: f.token, password: f.nextPassword, csrfToken: 'invented-token' }),
  });
  const response = await onRequestPost({ request, env: f.env });
  assert.equal(response.status, 403);
  assert.equal(await readResetRecord(f.env, f.token), f.userId);
});
