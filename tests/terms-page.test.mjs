import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const terms = fs.readFileSync(new URL('../dist/terms.html', import.meta.url), 'utf8');
const signup = fs.readFileSync(new URL('../dist/signup.html', import.meta.url), 'utf8');
const memberApp = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const accountApi = fs.readFileSync(new URL('../functions/api/account.js', import.meta.url), 'utf8');

test('interim terms cover marketplace, AI, liability, billing, and dispute risks', () => {
  assert.match(terms, /marketplace and coordination platform/i);
  assert.match(terms, /Technology, AI, and third-party services/i);
  assert.match(terms, /Limitation of liability/i);
  assert.match(terms, /Subscriptions, fees, and cancellation/i);
  assert.match(terms, /Dispute resolution with us/i);
  assert.match(terms, /electronic agreement/i);
});

test('public signup paths send the effective terms version for the audit record', () => {
  for (const source of [signup, memberApp]) {
    assert.match(source, /termsAccepted:\s*true/);
    assert.match(source, /termsVersion:\s*["']2026-08-11["']/);
  }
  assert.match(accountApi, /termsAccepted:\s*body\.termsAccepted === true/);
  assert.match(accountApi, /acceptedAt:/);
});
