import test from "node:test";
import assert from "node:assert/strict";

import {
  onRequestGet,
  buildMetrics,
  planKeyForAccount,
  isActiveSubscription,
} from "../functions/api/metrics.js";

const LOAD_STORE_KEY = "marketplace:loads:v1";

class MemoryKv {
  constructor() {
    this.values = new Map();
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
  async delete(key) {
    this.values.delete(key);
  }
  async list({ prefix = "", cursor, limit = 1000 } = {}) {
    const all = [...this.values.keys()]
      .filter((k) => k.startsWith(prefix))
      .sort();
    const start = cursor ? Number(cursor) : 0;
    const slice = all.slice(start, start + limit);
    const next = start + limit;
    return {
      keys: slice.map((name) => ({ name })),
      cursor: next < all.length ? String(next) : undefined,
      list_complete: next >= all.length,
    };
  }
}

function account(overrides = {}) {
  return {
    userId: "usr_x",
    email: "someone@example.invalid",
    emailVerifiedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function seed({ accounts = [], loads = [], token = "secret-token" } = {}) {
  const kv = new MemoryKv();
  let i = 0;
  for (const acct of accounts) {
    i += 1;
    await kv.put(`user:usr_${i}`, JSON.stringify({ ...acct, userId: `usr_${i}` }));
    // email index rows must be ignored by the scanner
    await kv.put(`user:email:person${i}@example.invalid`, `usr_${i}`);
  }
  await kv.put(LOAD_STORE_KEY, JSON.stringify(loads));
  return { env: { RELOCATION_MANAGER_LEADS: kv, METRICS_TOKEN: token }, kv };
}

function get(env, headers = {}) {
  return onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/metrics", { headers }),
    env,
  });
}

test("endpoint is disabled, not open, when no token is configured", async () => {
  const { env } = await seed({});
  env.METRICS_TOKEN = "";
  const res = await get(env);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /not configured/i);
});

test("rejects missing, wrong, and wrong-length tokens", async () => {
  const { env } = await seed({ accounts: [account()] });
  for (const headers of [
    {},
    { authorization: "Bearer nope" },
    { authorization: "Bearer secret-toke" },
    { authorization: "Bearer secret-tokenX" },
    { "x-metrics-token": "wrong" },
  ]) {
    const res = await get(env, headers);
    assert.equal(res.status, 401, `expected 401 for ${JSON.stringify(headers)}`);
  }
});

test("accepts a correct token via bearer or header", async () => {
  const { env } = await seed({ accounts: [account()] });
  for (const headers of [
    { authorization: "Bearer secret-token" },
    { "x-metrics-token": "secret-token" },
  ]) {
    const res = await get(env, headers);
    assert.equal(res.status, 200);
  }
});

test("response contains no personally identifying information", async () => {
  const { env } = await seed({
    accounts: [
      account({
        email: "leaky@example.invalid",
        name: "Jane Driver",
        company: "Jane Trucking LLC",
        paymentStatus: "paid_driver",
      }),
    ],
    loads: [
      {
        id: "load-1",
        status: "open",
        createdAt: isoDaysAgo(1),
        contactName: "Site Contact",
        contactPhone: "555-555-0100",
        from: "Atlanta, GA",
        postedByUserId: "usr_1",
        claimRequests: [],
      },
    ],
  });
  const res = await get(env, { authorization: "Bearer secret-token" });
  const text = await res.text();
  for (const secret of [
    "leaky@example.invalid",
    "Jane Driver",
    "Jane Trucking",
    "555-555-0100",
    "Site Contact",
    "usr_1",
    "Atlanta",
    "load-1",
  ]) {
    assert.equal(
      text.includes(secret),
      false,
      `metrics response leaked "${secret}"`,
    );
  }
});

test("counts paying members and identifies the most popular plan", async () => {
  const { env } = await seed({
    accounts: [
      account({ paymentStatus: "paid_driver" }),
      account({ paymentStatus: "paid_driver" }),
      account({ paymentStatus: "paid_driver" }),
      account({ paymentStatus: "paid_shipper" }),
      account({ paymentStatus: "paid_fleet_pro" }),
      account({ paymentStatus: "", subscriptionStatus: "" }), // signed up, never paid
      account({ subscriptionStatus: "past_due", paymentStatus: "paid_driver" }),
    ],
  });
  const res = await get(env, { authorization: "Bearer secret-token" });
  const body = await res.json();

  assert.equal(body.members.total, 7);
  assert.equal(body.members.paying, 5); // past_due is not counted as paying
  assert.equal(body.members.unpaid, 2);
  assert.equal(body.members.pastDue, 1);
  assert.equal(body.mostPopularPlan, "Independent Driver");

  const driver = body.plans.find((p) => p.key === "paid_driver");
  assert.equal(driver.count, 3);
  assert.equal(driver.mrrCents, 3 * 2999);

  // 3 driver + 1 shipper + 1 pro
  assert.equal(body.revenue.mrrCents, 3 * 2999 + 999 + 14999);
});

test("email index rows are not counted as accounts", async () => {
  const { env } = await seed({ accounts: [account(), account()] });
  const res = await get(env, { authorization: "Bearer secret-token" });
  const body = await res.json();
  assert.equal(body.members.total, 2);
});

test("counts loads by status, recency, and claim outcomes", async () => {
  const { env } = await seed({
    loads: [
      {
        id: "a",
        status: "open",
        createdAt: isoDaysAgo(2),
        claimRequests: [{ status: "pickup_requested" }],
      },
      {
        id: "b",
        status: "accepted",
        createdAt: isoDaysAgo(3),
        claimRequests: [{ status: "accepted" }, { status: "not_selected" }],
      },
      {
        id: "c",
        status: "under_review",
        createdAt: isoDaysAgo(20),
        claimRequests: [],
      },
      { id: "d", status: "open", createdAt: isoDaysAgo(120), claimRequests: [] },
    ],
  });
  const res = await get(env, { authorization: "Bearer secret-token" });
  const body = await res.json();

  assert.equal(body.loads.total, 4);
  assert.equal(body.loads.open, 2);
  assert.equal(body.loads.accepted, 1);
  assert.equal(body.loads.underReview, 1);
  assert.equal(body.loads.postedLast7, 2);
  assert.equal(body.loads.postedLast30, 3);
  assert.equal(body.loads.claimRequests.total, 3);
  assert.equal(body.loads.claimRequests.accepted, 1);
  assert.equal(body.loads.claimRequests.pending, 1);
  assert.equal(body.loads.acceptanceRatePct, 25);
});

test("empty marketplace reports zeros, never nulls or fabricated numbers", async () => {
  const { env } = await seed({});
  const res = await get(env, { authorization: "Bearer secret-token" });
  const body = await res.json();
  assert.equal(body.members.total, 0);
  assert.equal(body.members.paying, 0);
  assert.equal(body.revenue.mrrCents, 0);
  assert.equal(body.loads.total, 0);
  assert.equal(body.mostPopularPlan, null);
  assert.equal(body.loads.acceptanceRatePct, null);
});

test("plan resolution falls back from paymentStatus to price to type text", async () => {
  assert.equal(planKeyForAccount({ paymentStatus: "paid_fleet_growth" }), "paid_fleet_growth");
  assert.equal(planKeyForAccount({ subscriptionPriceCents: 14999 }), "paid_fleet_pro");
  assert.equal(
    planKeyForAccount({ type: "Broker 8–12 trucks - $149.99/mo" }),
    "paid_fleet_pro",
  );
  assert.equal(
    planKeyForAccount({ type: "Broker 1–3 trucks - $59.99/mo" }),
    "paid_fleet_starter",
  );
  assert.equal(
    planKeyForAccount({ type: "Customer needing pickup - $9.99/mo" }),
    "paid_shipper",
  );
  assert.equal(planKeyForAccount({ type: "unknown role" }), "");
});

test("subscription activity matches the auth module's definition", () => {
  assert.equal(isActiveSubscription({ paymentStatus: "paid_driver" }), true);
  assert.equal(isActiveSubscription({ subscriptionStatus: "active" }), true);
  assert.equal(isActiveSubscription({ paymentStatus: "paid" }), true);
  assert.equal(isActiveSubscription({ subscriptionStatus: "past_due" }), false);
  assert.equal(isActiveSubscription({ subscriptionStatus: "canceled" }), false);
  assert.equal(isActiveSubscription({}), false);
});

test("buildMetrics is pure and tolerates malformed records", () => {
  const out = buildMetrics(
    [null, undefined, {}, { paymentStatus: "paid_driver" }],
    [null, { status: "open" }, { status: undefined, claimRequests: "nope" }],
  );
  // null and undefined are skipped entirely; {} and the paid account are counted.
  assert.equal(out.members.total, 2);
  assert.equal(out.members.paying, 1);
  assert.equal(out.loads.total, 2);
});
