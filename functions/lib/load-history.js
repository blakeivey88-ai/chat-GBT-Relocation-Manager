import { cleanString } from "../api/_auth.js";

const HISTORY_PREFIX = "load-history:";

export function normalizeLoadHistoryEntry(entry = {}) {
  const occurredAt = cleanDate(entry.occurredAt || entry.createdAt) || new Date().toISOString();
  const eventType = cleanString(entry.eventType || "activity", 40).toLowerCase();
  const userId = cleanString(entry.userId, 80);
  const loadId = cleanString(entry.loadId, 120);
  return {
    id:
      cleanString(entry.id, 160) ||
      cleanString(`${loadId}:${eventType}:${userId}:${occurredAt}`, 160),
    userId,
    loadId,
    eventType,
    role: cleanString(entry.role, 30).toLowerCase(),
    status: cleanString(entry.status || eventType, 40).toLowerCase(),
    title: cleanString(entry.title, 180),
    origin: cleanString(entry.origin, 120),
    destination: cleanString(entry.destination, 120),
    equipment: cleanString(entry.equipment, 120),
    counterpartyName: cleanString(entry.counterpartyName, 120),
    rate: Math.max(0, Number(entry.rate || 0) || 0),
    occurredAt,
    verified: Boolean(entry.verified),
    detail: cleanString(entry.detail, 300),
  };
}

export function summarizeLoadHistory(entries = []) {
  const counts = {
    posted: 0,
    pickupRequested: 0,
    accepted: 0,
    pickedUp: 0,
    completed: 0,
  };
  for (const entry of entries) {
    const type = String(entry?.eventType || "").toLowerCase();
    if (type === "posted") counts.posted += 1;
    if (type === "pickup_requested") counts.pickupRequested += 1;
    if (type === "accepted") counts.accepted += 1;
    if (type === "picked_up") counts.pickedUp += 1;
    if (type === "completed") counts.completed += 1;
  }
  return {
    ...counts,
    total: entries.length,
    completionRate:
      counts.accepted > 0
        ? Math.min(100, Math.round((counts.completed / counts.accepted) * 100))
        : 0,
    lastActivityAt: entries[0]?.occurredAt || "",
  };
}

export async function recordLoadHistory(env, entry) {
  const normalized = normalizeLoadHistoryEntry(entry);
  if (!normalized.userId || !normalized.loadId) return null;

  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO load_history (
          load_history_id, user_id, load_id, event_type, participant_role,
          status, title, origin, destination, equipment, counterparty_name,
          rate, occurred_at, verified, detail, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(load_history_id) DO UPDATE SET
          status = excluded.status,
          counterparty_name = excluded.counterparty_name,
          occurred_at = excluded.occurred_at,
          verified = excluded.verified,
          detail = excluded.detail,
          payload_json = excluded.payload_json`,
      )
        .bind(
          normalized.id,
          normalized.userId,
          normalized.loadId,
          normalized.eventType,
          normalized.role,
          normalized.status,
          normalized.title,
          normalized.origin,
          normalized.destination,
          normalized.equipment,
          normalized.counterpartyName,
          String(normalized.rate || ""),
          normalized.occurredAt,
          normalized.verified ? 1 : 0,
          normalized.detail,
          JSON.stringify(normalized),
        )
        .run();
    } catch {
      // KV remains the compatibility store while D1 migrations roll out.
    }
  }

  if (env?.RELOCATION_MANAGER_LEADS) {
    const key = historyKey(normalized.userId);
    const current = await readKvHistory(env, normalized.userId);
    const next = [
      normalized,
      ...current.filter((item) => item.id !== normalized.id),
    ]
      .sort((a, b) => Date.parse(b.occurredAt || 0) - Date.parse(a.occurredAt || 0))
      .slice(0, 250);
    await env.RELOCATION_MANAGER_LEADS.put(key, JSON.stringify(next));
  }
  return normalized;
}

export async function readLoadHistory(env, userId, limit = 100) {
  const normalizedUserId = cleanString(userId, 80);
  const safeLimit = Math.max(1, Math.min(250, Number(limit || 100) || 100));
  if (!normalizedUserId) return [];

  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      const result = await env.RELOCATION_MANAGER_DB.prepare(
        `SELECT * FROM load_history
         WHERE user_id = ?
         ORDER BY occurred_at DESC, load_history_id DESC
         LIMIT ?`,
      )
        .bind(normalizedUserId, safeLimit)
        .all();
      if (Array.isArray(result?.results) && result.results.length) {
        return result.results.map((row) =>
          normalizeLoadHistoryEntry({
            ...(safeJson(row.payload_json) || {}),
            id: row.load_history_id,
            userId: row.user_id,
            loadId: row.load_id,
            eventType: row.event_type,
            role: row.participant_role,
            status: row.status,
            title: row.title,
            origin: row.origin,
            destination: row.destination,
            equipment: row.equipment,
            counterpartyName: row.counterparty_name,
            rate: row.rate,
            occurredAt: row.occurred_at,
            verified: Boolean(row.verified),
            detail: row.detail,
          }),
        );
      }
    } catch {
      // Fall through to KV.
    }
  }
  return (await readKvHistory(env, normalizedUserId)).slice(0, safeLimit);
}

function historyKey(userId) {
  return `${HISTORY_PREFIX}${cleanString(userId, 80)}:v1`;
}

async function readKvHistory(env, userId) {
  if (!env?.RELOCATION_MANAGER_LEADS) return [];
  const raw = await env.RELOCATION_MANAGER_LEADS.get(historyKey(userId));
  const parsed = safeJson(raw);
  return Array.isArray(parsed)
    ? parsed.map((entry) => normalizeLoadHistoryEntry(entry))
    : [];
}

function cleanDate(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function safeJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
