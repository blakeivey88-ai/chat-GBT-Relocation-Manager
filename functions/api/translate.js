import { requireEntitledAccount } from './_auth.js';

const SUPPORTED = new Set(['en', 'es', 'fr', 'ht', 'ru', 'ar']);

export async function onRequestPost(context) {
  try {
    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok) return json({ ok: false, error: access.error }, access.status || 401);

    const body = await context.request.json().catch(() => ({}));
    const text = String(body.text || '').trim();
    const target = String(body.target || '').trim().toLowerCase();
    const source = String(body.source || 'auto').trim().toLowerCase();

    if (!text) return json({ ok: false, error: 'Text is required.' }, 400);
    if (!SUPPORTED.has(target)) return json({ ok: false, error: 'Unsupported target language.' }, 400);
    if (target === source) return json({ ok: true, translatedText: text, provider: 'identity' });

    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: text, source: source === 'auto' ? 'auto' : source, target, format: 'text' }),
    });

    const data = await response.json().catch(() => ({}));
    const translatedText = String(data.translatedText || data.translation || data.text || text);
    return json({ ok: true, translatedText, provider: 'libretranslate' });
  } catch {
    return json({ ok: true, translatedText: text, provider: 'fallback' });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
