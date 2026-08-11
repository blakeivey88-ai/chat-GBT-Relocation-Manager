import { buildBrandedEmail, sendTransactionalEmail } from '../lib/email.js';

const CATEGORIES = new Set(['idea', 'problem', 'load-board', 'account', 'billing', 'safety', 'other']);
const RATE_WINDOW_SECONDS = 15 * 60;
const MAX_PER_WINDOW = 3;
const SUGGESTION_RETENTION_SECONDS = 180 * 24 * 60 * 60;
const DEFAULT_SUGGESTION_INBOX = 'Diveyrelocation@gmail.com';

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    if (!env.RELOCATION_MANAGER_LEADS) return json({ ok: false, error: 'Feedback storage is unavailable.' }, 503);
    if (!sameOrigin(request)) return json({ ok: false, error: 'Request origin was not accepted.' }, 403);
    if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ ok: false, error: 'Expected JSON.' }, 400);

    const input = await request.json();
    if (String(input?.website || '').trim()) return json({ ok: true, accepted: true });
    const category = CATEGORIES.has(String(input?.category || '').trim().toLowerCase())
      ? String(input.category).trim().toLowerCase()
      : 'idea';
    const message = cleanText(input?.message, 1000);
    const email = cleanEmail(input?.email);
    const consent = input?.contactConsent === true;
    if (message.length < 10) return json({ ok: false, error: 'Please share at least 10 characters.' }, 400);
    if (containsSensitiveData(message)) {
      return json({ ok: false, error: 'Remove passwords, payment-card numbers, government IDs, verification tokens, and insurance policy numbers before sending.' }, 400);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'Enter a valid email or leave it blank.' }, 400);
    if (email && !consent) return json({ ok: false, error: 'Allow follow-up contact or remove the email address.' }, 400);

    const rateKey = await rateLimitKey(request);
    const attempts = Number(await env.RELOCATION_MANAGER_LEADS.get(rateKey) || 0);
    if (attempts >= MAX_PER_WINDOW) return json({ ok: false, error: 'Too many suggestions were sent. Please try again later.' }, 429);
    await env.RELOCATION_MANAGER_LEADS.put(rateKey, String(attempts + 1), { expirationTtl: RATE_WINDOW_SECONDS });

    const now = new Date().toISOString();
    const id = `suggestion:${now}:${crypto.randomUUID()}`;
    await env.RELOCATION_MANAGER_LEADS.put(id, JSON.stringify({
      id,
      category,
      message,
      email: consent ? email : '',
      contactConsent: consent && Boolean(email),
      status: 'new',
      source: cleanText(input?.source || 'share-an-idea', 80),
      createdAt: now,
      updatedAt: now,
    }), {
      expirationTtl: SUGGESTION_RETENTION_SECONDS,
      metadata: { category, status: 'new', createdAt: now },
    });

    const notification = notifySuggestionInbox(env, {
      category,
      message,
      email: consent ? email : '',
      reference: id.split(':').at(-1).slice(0, 8),
    }).catch(() => ({ accepted: false }));
    if (typeof waitUntil === 'function') waitUntil(notification);
    else await notification;
    return json({ ok: true, accepted: true, reference: id.split(':').at(-1).slice(0, 8) });
  } catch {
    return json({ ok: false, error: 'Your suggestion could not be saved.' }, 500);
  }
}

async function notifySuggestionInbox(env, suggestion) {
  if (!env?.EMAIL?.send && !String(env?.RESEND_API_KEY || '').trim()) return { accepted: false };
  const lines = [
    `Category: ${suggestion.category}`,
    `Reference: ${suggestion.reference}`,
    `Follow-up email: ${suggestion.email || 'Not provided'}`,
    '',
    suggestion.message,
  ];
  const { text, html } = buildBrandedEmail({ headline: 'New website suggestion', bodyLines: lines });
  return sendTransactionalEmail(env, {
    to: cleanEmail(env?.SUGGESTION_INBOX) || DEFAULT_SUGGESTION_INBOX,
    subject: `[Website suggestion] ${suggestion.category} · ${suggestion.reference}`,
    text,
    html,
    requestId: `suggestion-${suggestion.reference}`,
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'allow': 'POST, OPTIONS' } });
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

function cleanText(value, limit) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanEmail(value) { return cleanText(value, 254).toLowerCase(); }

function containsSensitiveData(value) {
  const text = String(value || '');
  return /\b(?:password|passwd|verification token|reset token|api key|secret key|ssn|social security|policy number)\b\s*[:=#-]?\s*\S+/i.test(text)
    || /\b\d{3}-\d{2}-\d{4}\b/.test(text)
    || /(?:^|\D)(?:\d[ -]?){12}\d(?:[ -]?\d)*(?!\d)/.test(text);
}

async function rateLimitKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const bucket = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}:${bucket}`));
  const hash = [...new Uint8Array(digest)].slice(0, 10).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `suggestion-rate:${hash}`;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
