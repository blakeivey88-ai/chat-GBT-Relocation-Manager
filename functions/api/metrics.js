/**
 * GET /api/metrics — aggregate business metrics for Ralph Mission Control.
 *
 * SECURITY MODEL
 *  - Requires a bearer token that must match env.METRICS_TOKEN. No token configured
 *    on Cloudflare Pages => endpoint is hard-disabled (503), never open.
 *  - Returns AGGREGATE COUNTS ONLY. No emails, names, userIds, phone numbers,
 *    company names, or load contents are ever included in the response.
 *  - Never cached.
 *
 * Every number returned is counted from stored records. Nothing is estimated,
 * projected, or sampled. If a value can't be derived it is omitted, not guessed.
 */

const LOAD_STORE_KEY = "marketplace:loads:v1";
const KV_PAGE_LIMIT = 1000;
const MAX_ACCOUNTS_SCANNED = 20000;

/** Canonical plan table — mirrors functions/api/stripe-webhook.js */
const PLANS = [
  { key: "paid_shipper", label: "Shipper", priceCents: 999 },
  { key: "paid_driver", label: "Independent Driver", priceCents: 2999 },
  { key: "paid_fleet_starter", label: "Carrier & Broker Starter", priceCents: 5999 },
  { key: "paid_fleet_growth", label: "Carrier & Broker Growth", priceCents: 7999 },
  { key: "paid_fleet_pro", label: "Carrier & Broker Pro", priceCents: 14999 },
  { key: "paid_dispatcher_broker", label: "Dispatcher & Broker", priceCents: 18999 },
];

const PLAN_BY_KEY = new Map(PLANS.map((p) => [p.key, p]));

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

/** Length-safe comparison so the token isn't trivially probed by timing. */
function tokensMatch(provided, expected) {
  const a = String(provided || "");
  const b = String(expected || "");
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function presentedToken(request) {
  const auth = String(request.headers.get("authorization") || "");
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return String(request.headers.get("x-metrics-token") || "").trim();
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Resolve an account to a plan key using paymentStatus, then price, then type text. */
export function planKeyForAccount(account) {
  const status = String(account?.paymentStatus || "").trim().toLowerCase();
  if (PLAN_BY_KEY.has(status)) return status;

  const cents = Number(account?.subscriptionPriceCents || 0) || 0;
  if (cents > 0) {
    const byPrice = PLANS.find((p) => p.priceCents === cents);
    if (byPrice) return byPrice.key;
  }

  const type = String(account?.type || "").toLowerCase();
  if (/customer needing pickup|shipper/.test(type)) return "paid_shipper";
  if (/dispatcher/.test(type)) return "paid_dispatcher_broker";
  if (/8[-–]12/.test(type)) return "paid_fleet_pro";
  if (/4[-–]7/.test(type)) return "paid_fleet_growth";
  if (/1[-–]3/.test(type)) return "paid_fleet_starter";
  if (/independent driver|owner[- ]?operator/.test(type)) return "paid_driver";
  return "";
}

/** "active" if paymentStatus/subscriptionStatus is paid or paid_*, matching _auth.js */
export function isActiveSubscription(account) {
  const raw = String(
    account?.subscriptionStatus || account?.paymentStatus || "",
  )
    .trim()
    .toLowerCase();
  if (!raw) return false;
  return raw === "paid" || raw === "active" || raw.startsWith("paid_");
}

function daysAgoIso(days, nowIso) {
  const nowMs = Date.parse(String(nowIso || ""));
  const baseline = Number.isFinite(nowMs) ? nowMs : Date.now();
  return new Date(baseline - days * 86400000).toISOString();
}

/**
 * Pure aggregation over already-loaded records. Exported so tests can drive it
 * directly without a KV binding.
 */
export function buildMetrics(accounts, loads, nowIso = new Date().toISOString()) {
  const since7 = daysAgoIso(7, nowIso);
  const since30 = daysAgoIso(30, nowIso);

  const members = {
    total: 0,
    emailVerified: 0,
    carrierVerified: 0,
    paying: 0,
    unpaid: 0,
    pastDue: 0,
  };

  const planCounts = new Map(PLANS.map((p) => [p.key, 0]));
  let mrrCents = 0;

  for (const account of accounts) {
    if (!account) continue;
    members.total += 1;
    if (String(account.emailVerifiedAt || "").trim()) members.emailVerified += 1;
    if (String(account.carrierVerifiedAt || "").trim()) members.carrierVerified += 1;

    const status = String(
      account.subscriptionStatus || account.paymentStatus || "",
    ).trim().toLowerCase();
    if (status === "past_due") members.pastDue += 1;

    if (isActiveSubscription(account)) {
      members.paying += 1;
      const key = planKeyForAccount(account);
      if (key && planCounts.has(key)) {
        planCounts.set(key, planCounts.get(key) + 1);
        mrrCents += PLAN_BY_KEY.get(key).priceCents;
      }
    } else {
      members.unpaid += 1;
    }
  }

  const plans = PLANS.map((p) => ({
    key: p.key,
    label: p.label,
    priceCents: p.priceCents,
    count: planCounts.get(p.key) || 0,
    mrrCents: (planCounts.get(p.key) || 0) * p.priceCents,
  })).sort((a, b) => b.count - a.count || b.priceCents - a.priceCents);

  const mostPopular = plans[0] && plans[0].count > 0 ? plans[0].label : null;

  const loadStats = {
    total: 0,
    open: 0,
    accepted: 0,
    underReview: 0,
    other: 0,
    postedLast7: 0,
    postedLast30: 0,
  };
  let claimTotal = 0;
  let claimAccepted = 0;
  let claimPending = 0;

  for (const load of loads) {
    if (!load) continue;
    loadStats.total += 1;
    const status = String(load.status || "open").trim().toLowerCase();
    if (status === "open") loadStats.open += 1;
    else if (status === "accepted") loadStats.accepted += 1;
    else if (status === "under_review") loadStats.underReview += 1;
    else loadStats.other += 1;

    const createdAt = String(load.createdAt || "");
    if (createdAt) {
      if (createdAt >= since7) loadStats.postedLast7 += 1;
      if (createdAt >= since30) loadStats.postedLast30 += 1;
    }

    const requests = Array.isArray(load.claimRequests) ? load.claimRequests : [];
    for (const req of requests) {
      claimTotal += 1;
      const rs = String(req?.status || "").trim().toLowerCase();
      if (rs === "accepted") claimAccepted += 1;
      else if (rs === "pickup_requested" || rs === "viewed") claimPending += 1;
    }
  }

  const acceptanceRate =
    loadStats.total > 0
      ? Math.round((loadStats.accepted / loadStats.total) * 1000) / 10
      : null;

  return {
    ok: true,
    generatedAt: nowIso,
    members,
    plans,
    mostPopularPlan: mostPopular,
    revenue: {
      mrrCents,
      mrrUsd: Math.round(mrrCents) / 100,
      note: "Sum of list price for active subscriptions. Does not account for Stripe fees, proration, discounts, or failed charges.",
    },
    loads: {
      ...loadStats,
      claimRequests: {
        total: claimTotal,
        accepted: claimAccepted,
        pending: claimPending,
      },
      acceptanceRatePct: acceptanceRate,
    },
  };
}

async function readAllAccounts(env) {
  const kv = env.RELOCATION_MANAGER_LEADS;
  const accounts = [];
  let cursor;
  let scanned = 0;
  let truncated = false;

  do {
    const page = await kv.list({ prefix: "user:", cursor, limit: KV_PAGE_LIMIT });
    cursor = page?.list_complete ? undefined : page?.cursor;
    const keys = Array.isArray(page?.keys) ? page.keys : [];
    for (const entry of keys) {
      const name = String(entry?.name || "");
      // Skip the email->userId index rows; they are pointers, not accounts.
      if (name.startsWith("user:email:")) continue;
      if (scanned >= MAX_ACCOUNTS_SCANNED) {
        truncated = true;
        break;
      }
      scanned += 1;
      const raw = await kv.get(name);
      if (!raw) continue;
      const parsed = safeJsonParse(raw);
      if (parsed && typeof parsed === "object") accounts.push(parsed);
    }
    if (truncated) break;
  } while (cursor);

  return { accounts, truncated };
}

async function readLoads(env) {
  const raw = await env.RELOCATION_MANAGER_LEADS.get(LOAD_STORE_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function onRequestGet({ request, env }) {
  const expected = String(env?.METRICS_TOKEN || "").trim();
  if (!expected) {
    return jsonResponse(
      {
        ok: false,
        error:
          "Metrics endpoint is not configured. Set the METRICS_TOKEN secret on Cloudflare Pages to enable it.",
      },
      503,
    );
  }

  if (!tokensMatch(presentedToken(request), expected)) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
  }

  if (!env?.RELOCATION_MANAGER_LEADS) {
    return jsonResponse({ ok: false, error: "Storage unavailable." }, 503);
  }

  try {
    const [{ accounts, truncated }, loads] = await Promise.all([
      readAllAccounts(env),
      readLoads(env),
    ]);
    const payload = buildMetrics(accounts, loads);
    if (truncated) {
      payload.warning = `Account scan capped at ${MAX_ACCOUNTS_SCANNED}. Counts are a floor, not a total.`;
    }
    return jsonResponse(payload);
  } catch {
    return jsonResponse(
      { ok: false, error: "Failed to build metrics." },
      500,
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
