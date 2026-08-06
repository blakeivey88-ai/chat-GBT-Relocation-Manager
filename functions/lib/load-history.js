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

// Count each user's LIFETIME verified, completed loads for the leaderboard.
//
// Metric decision (intentional, preserved): the public number is the all-time
// total of verified + completed loads, not a rolling window. Lifetime totals
// are stable, always non-decreasing, and match the "verified work" trust story;
// a windowed metric is a separate future unit (the 90-day figure stays 0 today).
//
// D1: a SINGLE grouped aggregation over the whole table (backed by
// idx_load_history_verified_completed), so the query count is constant no matter
// how many accounts are ranked — the old code issued one history read per
// account, which grew Cloudflare subrequests with the member base. No IN (...)
// list is used, so D1 bound-parameter limits are never a factor. D1 holds all
// history, so a requested user absent from the result is an authoritative zero.
//
// KV fallback (no D1): reads at most `kvScanLimit` per-account histories so the
// fallback stays bounded. Returns `complete: false` when it could not scan every
// requested user — an unscanned account is UNKNOWN, never a genuine zero, so the
// caller must fail closed rather than publish a fabricated zero ranking.
//
// Returns `{ counts: Map<userId, number>, complete: boolean }`.
export async function readVerifiedCompletedCounts(env, userIds = [], options = {}) {
  const kvScanLimit = Math.max(0, Number(options.kvScanLimit ?? 200) || 0);
  const requested = new Set(
    (Array.isArray(userIds) ? userIds : [])
      .map((value) => cleanString(value, 80))
      .filter(Boolean),
  );
  const counts = new Map();
  if (!requested.size) return { counts, complete: true };

  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      const result = await env.RELOCATION_MANAGER_DB.prepare(
        `SELECT user_id, COUNT(*) AS verified_loads
           FROM load_history
          WHERE verified = 1 AND event_type = 'completed'
          GROUP BY user_id`,
      ).all();
      const rows = Array.isArray(result?.results) ? result.results : [];
      for (const row of rows) {
        const uid = cleanString(row?.user_id, 80);
        if (uid && requested.has(uid)) {
          counts.set(uid, Math.max(0, Number(row?.verified_loads || 0) || 0));
        }
      }
      // D1 is authoritative for the full table; absent requested users are zero.
      return { counts, complete: true };
    } catch {
      // Fall through to the bounded KV path.
    }
  }

  let scanned = 0;
  for (const uid of requested) {
    if (scanned >= kvScanLimit) break;
    scanned += 1;
    const history = await readKvHistory(env, uid);
    const verifiedCompleted = history.filter(
      (entry) =>
        entry?.verified && String(entry.eventType).toLowerCase() === "completed",
    ).length;
    if (verifiedCompleted) counts.set(uid, verifiedCompleted);
  }
  // If any requested user went unscanned, the result is not authoritative:
  // signal incompleteness so the caller fails closed instead of zeroing them.
  return { counts, complete: requested.size <= kvScanLimit };
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
