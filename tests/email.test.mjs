import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPasswordResetEmail,
  makePasswordResetUrl,
  sendPasswordResetEmail,
} from '../functions/lib/email.js';

test('creates a reset URL for the dedicated reset page', () => {
  const url = new URL(makePasswordResetUrl({ token: 'secure token', email: 'driver@example.com' }));
  assert.equal(url.origin, 'https://relocationmanagerusa.com');
  assert.equal(url.pathname, '/reset-password');
  assert.equal(url.searchParams.get('reset_token'), 'secure token');
  assert.equal(url.searchParams.get('email'), 'driver@example.com');
});

test('escapes user content in password reset HTML', () => {
  const message = buildPasswordResetEmail({ resetUrl: 'https://example.com/?a=1&b=2', name: '<Driver>' });
  assert.match(message.html, /&lt;Driver&gt;/);
  assert.doesNotMatch(message.html, /Hi <Driver>/);
  assert.match(message.text, /expires in 30 minutes/);
});

test('sends a password reset email through Resend without exposing its key', async () => {
  let request;
  const fakeFetch = async (url, init) => {
    request = { url, init };
    return { ok: true, status: 200 };
  };
  const result = await sendPasswordResetEmail(
    { RESEND_API_KEY: 'secret-key', PASSWORD_RESET_FROM_EMAIL: 'Support <support@example.com>' },
    { to: 'driver@example.com', resetUrl: 'https://example.com/reset', requestId: 'request-1' },
    fakeFetch,
  );
  assert.equal(result.provider, 'resend');
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.init.headers.authorization, 'Bearer secret-key');
  assert.equal(request.init.headers['idempotency-key'], 'password-reset-request-1');
  const body = JSON.parse(request.init.body);
  assert.deepEqual(body.to, ['driver@example.com']);
  assert.equal(body.from, 'Support <support@example.com>');
});

test('fails loudly when no email provider is configured', async () => {
  await assert.rejects(
    sendPasswordResetEmail({}, { to: 'driver@example.com', resetUrl: 'https://example.com/reset' }),
    /not configured/,
  );
});
