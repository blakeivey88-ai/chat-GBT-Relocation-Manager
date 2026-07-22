const DEFAULT_LIMIT = 100;
const KV_PREFIX = 'audit:';

function hasD1(env) {
  return Boolean(env?.RELOCATION_MANAGER_DB?.prepare);
}

function normalizeJson(value) {
  if (value == null) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { value };
    }
  }
  if (typeof value !== 'object') return { value };
  return value;
}

function cleanText(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function makeEventId() {
  return `audit_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function recordAuditEvent(env, input = {}) {
  const now = cleanText(input.createdAt || new Date().toISOString(), 80);
  const event = {
    auditId: cleanText(input.auditId || makeEventId(), 80),
    verifiedEventRef: cleanText(input.verifiedEventRef || input.eventRef || input.reference || input.actionType || 'manual-event', 160),
    actorUserId: cleanText(input.actorUserId || '', 80),
    actorRole: cleanText(input.actorRole || '', 40),
    actionType: cleanText(input.actionType || '', 80),
    targetType: cleanText(input.targetType || '', 80),
    targetId: cleanText(input.targetId || '', 120),
    before: normalizeJson(input.before),
    after: normalizeJson(input.after),
    reason: cleanText(input.reason || '', 240),
    meta: normalizeJson(input.meta),
    createdAt: now,
  };

  if (hasD1(env)) {
    await env.RELOCATION_MANAGER_DB.prepare(
      `INSERT INTO audit_log (
        audit_id,
        verified_event_ref,
        actor_user_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        before_json,
        after_json,
        reason,
        meta_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      event.auditId,
      event.verifiedEventRef,
      event.actorUserId,
      event.actorRole,
      event.actionType,
      event.targetType,
      event.targetId,
      JSON.stringify(event.before),
      JSON.stringify(event.after),
      event.reason,
      JSON.stringify(event.meta),
      event.createdAt,
    ).run();
    return event;
  }

  const key = `${KV_PREFIX}${event.createdAt}:${event.auditId}`;
  await env.RELOCATION_MANAGER_LEADS.put(key, JSON.stringify(event));
  return event;
}

export async function listAuditEvents(env, { limit = DEFAULT_LIMIT } = {}) {
  const max = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, 250));
  if (hasD1(env)) {
    const result = await env.RELOCATION_MANAGER_DB.prepare(
      'SELECT * FROM audit_log ORDER BY created_at DESC, audit_id DESC LIMIT ?'
    ).bind(max).all();
    return Array.isArray(result?.results) ? result.results : [];
  }

  const records = [];
  let cursor;
  while (records.length < max) {
    const batch = await env.RELOCATION_MANAGER_LEADS.list({ prefix: KV_PREFIX, limit: 1000, cursor });
    for (const key of batch.keys || []) {
      if (records.length >= max) break;
      const raw = await env.RELOCATION_MANAGER_LEADS.get(key.name);
      if (!raw) continue;
      try {
        records.push(JSON.parse(raw));
      } catch {
        continue;
      }
    }
    if (!batch.cursor || !batch.list_complete) break;
    cursor = batch.cursor;
  }
  return records.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, max);
}
