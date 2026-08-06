import test from "node:test";
import assert from "node:assert/strict";

import { buildDeterministicSummary } from "../functions/lib/dispatch.js";
import { onRequestPost } from "../functions/api/dispatch.js";
import { createSession, userIdKey } from "../functions/api/_auth.js";

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
}

test("deterministic summary reports an empty board honestly", () => {
  const input = { origin: "Boise, ID", destination: "Anywhere", equipment: "Any" };
  const summary = buildDeterministicSummary(input, [], null, true);
  assert.match(summary, /No open loads currently match/);
  assert.match(summary, /no invented matches/i);
});

test("deterministic summary is stable, bounded, and limited to five matches", () => {
  const input = { origin: "Atlanta, GA", destination: "Anywhere", equipment: "Box truck" };
  const matches = Array.from({ length: 8 }, (_, index) => ({
    from: `Atlanta ${index}`,
    to: `Nashville ${index}`,
    rate: 700 + index,
    ratePerMile: 2.5,
    eq: "26 ft Box",
  }));
  const first = buildDeterministicSummary(input, matches, null, true);
  const second = buildDeterministicSummary(input, matches, null, true);
  assert.equal(first, second);
  assert.ok(first.length <= 4000);
  assert.match(first, /5 real open loads/);
  assert.doesNotMatch(first, /Nashville 5/);
});

test("deterministic summary ignores contact details and secrets", () => {
  const sensitive = "do-not-expose@example.invalid";
  const summary = buildDeterministicSummary(
    { origin: "Atlanta, GA", destination: "Nashville, TN", equipment: "Box truck" },
    [{
      from: "Atlanta, GA",
      to: "Nashville, TN",
      rate: 750,
      ratePerMile: 3,
      eq: "26 ft Box",
      contactEmail: sensitive,
      contactPhone: "555-555-0100",
      apiKey: "secret-value",
      reasons: [sensitive],
    }],
    null,
    true,
  );
  assert.doesNotMatch(summary, /do-not-expose|555-555-0100|secret-value/);
});

test("deterministic summary handles malformed optional values without side effects", () => {
  const input = Object.freeze({ origin: "", destination: null, equipment: null });
  const match = Object.freeze({ from: null, to: null, rate: "not-a-number", eq: null });
  const summary = buildDeterministicSummary(input, [match], "not-an-object", true);
  assert.match(summary, /Origin not listed/);
  assert.match(summary, /\$0/);
  assert.deepEqual(input, { origin: "", destination: null, equipment: null });
});

test("shipper summary remains a draft checklist", () => {
  const summary = buildDeterministicSummary({}, [], null, false);
  assert.match(summary, /pickup planning checklist/i);
  assert.match(summary, /Nothing is posted without your approval/);
});

test("dispatch works without an AI key and preserves draft-only permissions", async () => {
  const account = {
    userId: "usr_dispatch_safety",
    email: "usr_dispatch_safety@example.invalid",
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Dispatch Safety",
    company: "Dispatch Safety LLC",
    role: "Trucking Company",
    type: "Broker 1–3 trucks - $59.99/mo",
    paymentStatus: "paid_fleet_starter",
    subscriptionStatus: "active",
    subscriptionPriceCents: 5999,
    loadAccess: "claim_post",
    subscriptionAccess: "claim_post",
    carrierVerifiedAt: "2026-07-23T00:00:00.000Z",
  };
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  await kv.put(LOAD_STORE_KEY, JSON.stringify([{
    id: "load-dispatch-safety",
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 750,
    mi: 250,
    eq: "26 ft Box",
    kind: "box",
    status: "open",
    trust: 92,
    insurance: "Verified",
    expiresAt: "2099-01-01T00:00:00.000Z",
    contactName: "Private Person",
    contactPhone: "555-555-0100",
  }]));
  const session = await createSession(env, account.userId);
  const csrf = "dispatch-safety-csrf";
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/dispatch", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({ origin: "Atlanta, GA", equipment: "26 ft box truck" }),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.assistantMode, "deterministic");
  assert.equal(body.requiresApproval, true);
  assert.equal(body.matches.length, 1);
  assert.equal(body.permissions.canSaveLaneAlert, true);
  assert.ok(body.assistantMessage.length > 0);
  assert.ok(!JSON.stringify(body).includes("555-555-0100"));
  assert.ok(!JSON.stringify(body).includes("Private Person"));
});
