export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    if (!env.RELOCATION_MANAGER_LEADS) {
      return json({ ok: false, error: 'Lead store is not configured.' }, 500);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return json({ ok: false, error: 'Expected JSON.' }, 400);
    }

    const body = await request.json();
    const lead = sanitizeLead(body);

    if (!lead.name || !lead.email) {
      return json({ ok: false, error: 'Name and email are required.' }, 400);
    }

    const now = new Date().toISOString();
    const idKey = leadEmailIndexKey(lead.email);
    const existingId = await env.RELOCATION_MANAGER_LEADS.get(idKey);
    const existing = existingId ? await readLead(env, existingId) : null;
    const merged = {
      ...(existing || {}),
      ...lead,
      id: existing?.id || `${now}-${crypto.randomUUID()}`,
      created_at: existing?.created_at || now,
      updated_at: now,
      source: existing?.source || 'relocationmanagerusa.com',
      verification_status: existing?.verification_status || 'new',
      payment_status: existing?.payment_status || 'unpaid_waitlist',
      submission_count: Number(existing?.submission_count || 0) + 1,
      consent_to_communications: normalizeConsent(lead.consent),
      tags: mergeTags(existing?.tags, buildLeadTags(lead)),
    };

    await env.RELOCATION_MANAGER_LEADS.put(merged.id, JSON.stringify(merged), {
      metadata: {
        email: merged.email,
        type: merged.type,
        created_at: merged.created_at,
      },
    });
    await env.RELOCATION_MANAGER_LEADS.put(idKey, merged.id);

    return json({ ok: true, id: merged.id, updated: Boolean(existing) });
  } catch (error) {
    return json({ ok: false, error: 'Lead submission failed.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function sanitizeLead(input) {
  const allowed = ['type', 'name', 'email', 'phone', 'company', 'equipment', 'pickup_area', 'preferred_lane', 'min_rate', 'instagram', 'notes', 'consent'];
  const output = {};
  for (const key of allowed) {
    const value = input?.[key];
    if (key === 'consent') {
      output[key] = normalizeConsent(value);
    } else {
      output[key] = typeof value === 'string' ? value.trim().slice(0, 1000) : '';
    }
  }
  output.email = output.email.toLowerCase();
  return output;
}

function normalizeConsent(value) {
  if (value === true) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'on' || normalized === 'yes' || normalized === '1';
  }
  return false;
}

function buildLeadTags(lead) {
  const tags = ['new-lead'];
  const type = String(lead.type || '').toLowerCase();
  if (/customer/.test(type)) tags.push('shipper');
  else if (/independent driver/.test(type)) tags.push('driver', 'professional-plan');
  else if (/broker 1–3/.test(type) || /broker 1-3/.test(type)) tags.push('broker', 'fleet-1-3', 'premium-plan');
  else if (/broker 4–7/.test(type) || /broker 4-7/.test(type)) tags.push('broker', 'fleet-4-7', 'premium-plan');
  else if (/broker 7–12/.test(type) || /broker 7-12/.test(type)) tags.push('broker', 'fleet-7-12', 'premium-plan');
  else tags.push('unclassified');

  if (/customer/.test(type)) tags.push('basic-plan');
  if (normalizeConsent(lead.consent)) tags.push('communications-consent');
  return dedupeTags(tags);
}

function mergeTags(existing, additions) {
  const base = Array.isArray(existing) ? existing.slice() : [];
  return dedupeTags([...base, ...additions]);
}

function dedupeTags(tags) {
  return [...new Set((tags || []).filter(Boolean).map((tag) => String(tag).trim().toLowerCase().replace(/\s+/g, '-')))];
}

async function readLead(env, id) {
  const raw = await env.RELOCATION_MANAGER_LEADS.get(id);
  return raw ? JSON.parse(raw) : null;
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

function leadEmailIndexKey(email) {
  return `lead:email:${String(email || '').trim().toLowerCase()}`;
}
