const DEFAULT_SITE_ORIGIN = 'https://relocationmanagerusa.com';
const DEFAULT_FROM = 'Relocation Manager USA <no-reply@relocationmanagerusa.com>';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Generic transactional sender reusing the same transport as password resets.
// Returns { accepted: true } on success; throws when delivery is not configured
// or the provider rejects the message. Callers decide whether that is fatal.
export async function sendTransactionalEmail(
  env,
  { to, subject, text, html, requestId = '' },
  fetchImpl = fetch,
) {
  const from = String(env?.PASSWORD_RESET_FROM_EMAIL || DEFAULT_FROM).trim();
  const message = { subject, text, html };

  if (env?.EMAIL?.send) {
    await env.EMAIL.send({ from, to, ...message });
    return { provider: 'cloudflare', accepted: true };
  }

  const apiKey = String(env?.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Transactional email delivery is not configured.');
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...(requestId ? { 'idempotency-key': String(requestId).slice(0, 256) } : {}),
    },
    body: JSON.stringify({ from, to: [to], ...message }),
  });

  if (!response.ok) {
    throw new Error(`Email provider rejected the request (${response.status}).`);
  }

  return { provider: 'resend', accepted: true };
}

// Simple branded shell shared by all confirmation emails.
export function buildBrandedEmail({ headline, bodyLines = [], ctaLabel = '', ctaUrl = '' }) {
  const safeHeadline = escapeHtml(headline);
  const paragraphsHtml = bodyLines
    .map((line) => `<p style="font-size:16px;line-height:1.55">${escapeHtml(line)}</p>`)
    .join('');
  const ctaHtml = ctaLabel && ctaUrl
    ? `<p style="margin:26px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px">${escapeHtml(ctaLabel)}</a></p>`
    : '';
  const text = [headline, '', ...bodyLines, ctaUrl ? `\n${ctaLabel}: ${ctaUrl}` : '', '', 'Relocation Manager USA']
    .filter((line) => line !== null && line !== undefined)
    .join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#edf3f9;font-family:Arial,sans-serif;color:#172033"><div style="max-width:600px;margin:0 auto;padding:32px 16px"><div style="background:#071d3b;color:#fff;padding:22px 26px;border-radius:18px 18px 0 0;font-size:22px;font-weight:800">Relocation Manager USA</div><div style="background:#fff;padding:28px 26px;border:1px solid #dce6f0;border-top:0;border-radius:0 0 18px 18px"><p style="font-size:18px;font-weight:800">${safeHeadline}</p>${paragraphsHtml}${ctaHtml}<p style="font-size:12px;line-height:1.5;color:#7c8da3">Relocation Manager USA · This message confirms account or marketplace activity. If this was not you, contact support@relocationmanagerusa.com.</p></div></div></body></html>`;
  return { text, html };
}

export function makeEmailVerificationUrl({ token, email, plan = '', origin = DEFAULT_SITE_ORIGIN }) {
  const url = new URL('/verify.html', origin || DEFAULT_SITE_ORIGIN);
  url.searchParams.set('token', String(token || ''));
  url.searchParams.set('email', String(email || ''));
  if (plan) url.searchParams.set('plan', String(plan));
  return url.toString();
}

export async function sendVerificationEmail(env, { to, verifyUrl, name = '', requestId = '' }, fetchImpl = fetch) {
  const greeting = name ? `Hi ${String(name).trim()},` : 'Hello,';
  const { text, html } = buildBrandedEmail({
    headline: 'Verify your email to unlock checkout',
    bodyLines: [
      greeting,
      'Your Relocation Manager USA profile was created. Click below to confirm you own this email address — then secure checkout opens for your selected plan.',
      'If you did not create this account, ignore this email and nothing will happen.',
    ],
    ctaLabel: 'Verify my email',
    ctaUrl: verifyUrl,
  });
  return sendTransactionalEmail(
    env,
    { to, subject: 'Verify your Relocation Manager USA account', text, html, requestId: requestId ? `verify-${requestId}` : '' },
    fetchImpl,
  );
}

export function makePasswordResetUrl({ token, email, origin = DEFAULT_SITE_ORIGIN }) {
  const url = new URL('/reset-password', origin || DEFAULT_SITE_ORIGIN);
  url.searchParams.set('reset_token', String(token || ''));
  url.searchParams.set('email', String(email || ''));
  return url.toString();
}

export function buildPasswordResetEmail({ resetUrl, name = '' }) {
  const greeting = name ? `Hi ${String(name).trim()},` : 'Hello,';
  const safeGreeting = escapeHtml(greeting);
  const safeResetUrl = escapeHtml(resetUrl);
  const subject = 'Reset your Relocation Manager USA password';
  const text = `${greeting}\n\nWe received a request to reset your Relocation Manager USA password.\n\nSet a new password: ${resetUrl}\n\nThis secure link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.\n\nRelocation Manager USA`;
  const html = `<!doctype html><html><body style="margin:0;background:#edf3f9;font-family:Arial,sans-serif;color:#172033"><div style="max-width:600px;margin:0 auto;padding:32px 16px"><div style="background:#071d3b;color:#fff;padding:22px 26px;border-radius:18px 18px 0 0;font-size:22px;font-weight:800">Relocation Manager USA</div><div style="background:#fff;padding:28px 26px;border:1px solid #dce6f0;border-top:0;border-radius:0 0 18px 18px"><p style="font-size:16px">${safeGreeting}</p><p style="font-size:16px;line-height:1.55">We received a request to reset your password.</p><p style="margin:26px 0"><a href="${safeResetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px">Set a new password</a></p><p style="font-size:14px;line-height:1.55;color:#5d6d82">This secure link expires in 30 minutes and can only be used once. If you did not request this, you can safely ignore this email.</p><p style="font-size:12px;line-height:1.5;color:#7c8da3;word-break:break-all">If the button does not work, copy this link:<br>${safeResetUrl}</p></div></div></body></html>`;
  return { subject, text, html };
}

export async function sendPasswordResetEmail(env, { to, resetUrl, name = '', requestId = '' }, fetchImpl = fetch) {
  const message = buildPasswordResetEmail({ resetUrl, name });
  const from = String(env?.PASSWORD_RESET_FROM_EMAIL || DEFAULT_FROM).trim();

  if (env?.EMAIL?.send) {
    await env.EMAIL.send({ from, to, ...message });
    return { provider: 'cloudflare', accepted: true };
  }

  const apiKey = String(env?.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Password reset email delivery is not configured.');
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...(requestId ? { 'idempotency-key': `password-reset-${requestId}`.slice(0, 256) } : {}),
    },
    body: JSON.stringify({ from, to: [to], ...message }),
  });

  if (!response.ok) {
    throw new Error(`Password reset email provider rejected the request (${response.status}).`);
  }

  return { provider: 'resend', accepted: true };
}
