import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { onRequestPost } from '../functions/api/suggestions.js';

class MemoryKv {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) { return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })) }; }
}

function request(body, headers = {}) {
  return new Request('https://relocationmanagerusa.com/api/suggestions', {
    method: 'POST',
    headers: { origin: 'https://relocationmanagerusa.com', 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.10', ...headers },
    body: JSON.stringify(body),
  });
}

test('saves bounded anonymous product feedback without creating a lead profile', async () => {
  const kv = new MemoryKv();
  const response = await onRequestPost({ request: request({ category: 'load-board', message: 'Please add saved searches for favorite lanes.', source: 'test' }), env: { RELOCATION_MANAGER_LEADS: kv } });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const keys = [...kv.values.keys()].filter((key) => key.startsWith('suggestion:') && !key.startsWith('suggestion-rate:'));
  assert.equal(keys.length, 1);
  const saved = JSON.parse(await kv.get(keys[0]));
  assert.equal(saved.category, 'load-board');
  assert.equal(saved.email, '');
  assert.equal(saved.status, 'new');
  assert.equal([...kv.values.keys()].some((key) => key.startsWith('lead:email:')), false);
});

test('notifies the confirmed website inbox without making delivery required for storage', async () => {
  const kv = new MemoryKv();
  const sent = [];
  const pending = [];
  const env = { RELOCATION_MANAGER_LEADS: kv, EMAIL: { async send(message) { sent.push(message); } } };
  const response = await onRequestPost({
    request: request({ category: 'idea', message: 'Please add a clearer saved-load indicator.', email: 'member@example.com', contactConsent: true }),
    env,
    waitUntil(promise) { pending.push(promise); },
  });
  await Promise.all(pending);
  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'Diveyrelocation@gmail.com');
  assert.match(sent[0].subject, /Website suggestion/);

  env.EMAIL.send = async () => { throw new Error('Email unavailable'); };
  const stored = await onRequestPost({ request: request({ category: 'idea', message: 'Please add another useful dashboard shortcut.' }, { 'cf-connecting-ip': '192.0.2.44' }), env });
  assert.equal(stored.status, 200);
});

test('requires contact consent for optional email and rejects sensitive data', async () => {
  const env = { RELOCATION_MANAGER_LEADS: new MemoryKv() };
  const noConsent = await onRequestPost({ request: request({ category: 'idea', message: 'Please contact me about this useful idea.', email: 'member@example.com' }), env });
  assert.equal(noConsent.status, 400);
  const sensitive = await onRequestPost({ request: request({ category: 'account', message: 'My password: SuperSecret123 should work.' }, { 'cf-connecting-ip': '192.0.2.11' }), env });
  assert.equal(sensitive.status, 400);
});

test('honeypot is accepted without storage and rate limit stops the fourth submission', async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const bot = await onRequestPost({ request: request({ website: 'https://spam.example', message: 'Automated spam content here.' }), env });
  assert.equal(bot.status, 200);
  assert.equal([...kv.values.keys()].some((key) => key.startsWith('suggestion:')), false);
  for (let index = 0; index < 3; index += 1) {
    const response = await onRequestPost({ request: request({ message: `Useful suggestion number ${index} for the website.` }), env });
    assert.equal(response.status, 200);
  }
  const limited = await onRequestPost({ request: request({ message: 'One additional useful suggestion for the website.' }), env });
  assert.equal(limited.status, 429);
});

test('feedback page and entry points expose privacy guidance', async () => {
  const [page, support, member, publicScript, middleware] = await Promise.all([
    readFile(new URL('../dist/share-an-idea.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/support.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/member.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/public-site.js', import.meta.url), 'utf8'),
    readFile(new URL('../functions/_middleware.js', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /Do not include passwords/);
  assert.match(page, /name="website"/);
  assert.match(page, /\/api\/suggestions/);
  assert.match(support, /Share an idea/);
  assert.match(member, /Share an idea/);
  assert.match(publicScript, /share-an-idea\.html/);
  assert.match(middleware, /'\/api\/suggestions'/);
  assert.match(support, /Diveyrelocation@gmail\.com/);
});
