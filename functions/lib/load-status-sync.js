/**
 * Keep marketplace load status, D1 loads.status, and activity history aligned.
 * Prevents "history says delivered / card still says accepted".
 */
import { recordLoadHistory } from "./load-history.js";

export const LOAD_STORE_KEY = "marketplace:loads:v1";

const TERMINAL = new Set([
  "delivered",
  "completed",
  "empty",
  "cancelled",
  "canceled",
  "closed",
]);

/** Statuses that should never be downgraded back to accepted/open. */
export function isTerminalLoadStatus(status) {
  return TERMINAL.has(String(status || "").trim().toLowerCase());
}

/**
 * Normalize UI / event labels into a stable load.status value.
 * Messaging uses "Delivered", "In Transit", etc.
 */
export function normalizeLifecycleStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "empty") return "delivered";
  if (isTerminalLoadStatus(lower)) {
    if (lower === "canceled") return "cancelled";
    return lower;
  }
  if (/^delivered$/.test(lower)) return "delivered";
  if (/in[\s_-]?transit/.test(lower)) return "in_transit";
  if (/arrived at pickup|arrived.?pickup/.test(lower)) return "arrived_pickup";
  if (/loading started/.test(lower)) return "loading";
  if (/loading complete/.test(lower)) return "loaded";
  if (/arrived at delivery|arrived.?delivery/.test(lower)) return "arrived_delivery";
  if (/unloading/.test(lower)) return "unloading";
  if (/^delayed$/.test(lower)) return "delayed";
  return lower.replace(/\s+/g, "_").slice(0, 40);
}

/**
 * Prefer terminal statuses; never demote delivered → accepted.
 */
export function mergeLoadStatus(kvStatus, otherStatus) {
  const k = normalizeLifecycleStatus(kvStatus) || String(kvStatus || "").toLowerCase();
  const o = normalizeLifecycleStatus(otherStatus) || String(otherStatus || "").toLowerCase();
  if (isTerminalLoadStatus(k)) return k === "empty" ? "delivered" : k;
  if (isTerminalLoadStatus(o)) return o === "empty" ? "delivered" : o;
  if (o === "accepted" || k === "accepted") return "accepted";
  if (o && o !== "open") return o;
  return k || o || "open";
}

function cleanId(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

/**
 * Write lifecycle status to KV marketplace catalog + D1 loads row.
 * Best-effort: failures are returned, not thrown, so callers can still finish.
 */
export async function syncMarketplaceLoadLifecycle(
  env,
  {
    loadId,
    status,
    actorUserId = "",
    detail = "",
    completedAt = "",
    recordHistory = true,
  } = {},
) {
  const id = cleanId(loadId, 120);
  const nextStatus = normalizeLifecycleStatus(status);
  if (!id || !nextStatus) {
    return { ok: false, error: "loadId and status are required." };
  }

  const now = completedAt || new Date().toISOString();
  const terminal = isTerminalLoadStatus(nextStatus);
  let kvUpdated = false;
  let d1Updated = false;
  let load = null;

  // --- KV marketplace catalog ---
  try {
    if (env?.RELOCATION_MANAGER_LEADS?.get) {
      const raw = await env.RELOCATION_MANAGER_LEADS.get(LOAD_STORE_KEY);
      const loads = raw ? JSON.parse(raw) : [];
      if (Array.isArray(loads)) {
        const idx = loads.findIndex((item) => String(item?.id || "") === id);
        if (idx >= 0) {
          const current = loads[idx];
          const merged = mergeLoadStatus(current.status, nextStatus);
          loads[idx] = {
            ...current,
            status: merged,
            ...(terminal
              ? { completedAt: current.completedAt || now }
              : {}),
            lifecycleUpdatedAt: now,
            lifecycleUpdatedBy: cleanId(actorUserId, 80) || current.lifecycleUpdatedBy || "",
          };
          load = loads[idx];
          await env.RELOCATION_MANAGER_LEADS.put(
            LOAD_STORE_KEY,
            JSON.stringify(loads),
          );
          kvUpdated = true;
        }
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      kvUpdated,
      d1Updated,
    };
  }

  // --- D1 loads.status ---
  try {
    if (env?.RELOCATION_MANAGER_DB?.prepare) {
      // Update from accepted (or any non-terminal) to the new lifecycle status.
      // Also allow re-writing the same terminal status (idempotent).
      const result = await env.RELOCATION_MANAGER_DB.prepare(
        `UPDATE loads
         SET status = ?
         WHERE load_id = ?
           AND (
             status = 'accepted'
             OR status = ?
             OR lower(status) NOT IN ('delivered','completed','cancelled','canceled','closed')
           )`,
      )
        .bind(nextStatus === "empty" ? "delivered" : nextStatus, id, nextStatus)
        .run();
      d1Updated = Boolean(result?.success !== false);
    }
  } catch {
    d1Updated = false;
  }

  if (recordHistory && actorUserId) {
    try {
      await recordLoadHistory(env, {
        id: `${id}:lifecycle:${nextStatus}:${actorUserId}:${now}`,
        userId: actorUserId,
        loadId: id,
        eventType: terminal ? nextStatus : "status_update",
        role: "carrier",
        status: nextStatus,
        title: terminal
          ? `Load ${nextStatus}`
          : `Load status: ${nextStatus}`,
        occurredAt: now,
        verified: true,
        detail:
          detail ||
          (terminal
            ? `Load marked ${nextStatus}.`
            : `Load status updated to ${nextStatus}.`),
      });
    } catch {
      // history is best-effort
    }
  }

  return {
    ok: kvUpdated || d1Updated,
    status: nextStatus,
    kvUpdated,
    d1Updated,
    load,
  };
}
