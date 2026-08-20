import test from "node:test";
import assert from "node:assert/strict";

import { onRequestPost } from "../functions/api/loads.js";
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

function account(userId, overrides = {}) {
  return {
    userId,
    email: `${userId}@example.invalid`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: `${userId} name`,
    company: `${userId} LLC`,
    role: "Trucking Company",
    type: "Broker 1–3 trucks - $59.99/mo",
    paymentStatus: "paid_fleet_starter",
    subscriptionStatus: "active",
    subscriptionPriceCents: 5999,
    loadAccess: "claim_post",
    subscriptionAccess: "claim_post",
    carrierVerifiedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

function driverAccount(userId) {
  return account(userId, {
    role: "Owner-Operator",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionPriceCents: 2999,
    loadAccess: "claim",
    subscriptionAccess: "claim",
  });
}

function openLoad(id, from) {
  return {
    id,
    from,
    to: "Nashville, TN",
    rate: 685,
    mi: 250,
    pick: "Tomorrow 8am",
    wt: "3,200 lbs",
    eq: "26 ft Box",
    kind: "box",
    status: "open",
    postedByUserId: "usr_some_poster",
    expiresAt: "2099-01-01T00:00:00.000Z",
    claimRequests: [],
  };
}

async function seedEnv(accounts, loads) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  for (const acct of accounts) {
    await kv.put(userIdKey(acct.userId), JSON.stringify(acct));
  }
  await kv.put(LOAD_STORE_KEY, JSON.stringify(loads));
  return { kv, env };
}

async function claim(env, acct, loadId) {
  const session = await createSession(env, acct.userId);
  const csrf = `${acct.userId}-claim-csrf`;
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({ action: "claim", loadId }),
    }),
    env,
  });
  return { response, body: await response.json() };
}

test("a $29.99 driver gets exactly one concurrent pickup and an upgrade prompt", async () => {
  const driver = driverAccount("usr_one_truck");
  // Exclusive fulls so capacity cannot stack two jobs on one seat.
  const loads = [
    { ...openLoad("load-a", "Atlanta, GA"), commodity: "full exclusive truck", exclusiveTruck: true, wt: "9000 lbs" },
    { ...openLoad("load-b", "Macon, GA"), commodity: "full exclusive truck", exclusiveTruck: true, wt: "9000 lbs" },
  ];
  const { env } = await seedEnv([driver], loads);

  const first = await claim(env, driver, "load-a");
  assert.equal(first.response.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.ok, true);
  assert.ok(first.body.activePickup?.seatId);

  const second = await claim(env, driver, "load-b");
  assert.equal(second.response.status, 403, JSON.stringify(second.body));
  assert.ok(
    second.body.reason === "plan_concurrency_limit" || second.body.reason === "capacity_full",
    JSON.stringify(second.body),
  );
  assert.equal(second.body.planLimit, 1);
  assert.match(second.body.error, /upgrade|seat|capacity|space/i);
  assert.ok(second.body.route === "pricing" || second.body.route === "profile");
});

test("a completed pickup frees the slot for the next load", async () => {
  const driver = driverAccount("usr_free_slot");
  const { kv, env } = await seedEnv(
    [driver],
    [openLoad("load-a", "Atlanta, GA"), openLoad("load-b", "Macon, GA")],
  );

  const first = await claim(env, driver, "load-a");
  assert.equal(first.response.status, 200);

  // Mark the active pickup completed (as the workbench does after delivery).
  const stored = JSON.parse(await kv.get(userIdKey(driver.userId)));
  stored.activePickups = stored.activePickups.map((item) => ({
    ...item,
    status: "Completed",
  }));
  await kv.put(userIdKey(driver.userId), JSON.stringify(stored));

  const second = await claim(env, driver, "load-b");
  assert.equal(second.response.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.ok, true);
});

test("a 1–3 truck plan gets three concurrent slots and blocks the fourth", async () => {
  const fleet = account("usr_three_trucks");
  const loads = [
    openLoad("load-1", "Atlanta, GA"),
    openLoad("load-2", "Macon, GA"),
    openLoad("load-3", "Savannah, GA"),
    openLoad("load-4", "Augusta, GA"),
  ];
  const { env } = await seedEnv([fleet], loads);

  for (const id of ["load-1", "load-2", "load-3"]) {
    const result = await claim(env, fleet, id);
    assert.equal(result.response.status, 200, `${id}: ${JSON.stringify(result.body)}`);
  }

  const fourth = await claim(env, fleet, "load-4");
  assert.equal(fourth.response.status, 403, JSON.stringify(fourth.body));
  assert.equal(fourth.body.planLimit, 3);
  assert.match(fourth.body.error, /3 truck seats|all 3|upgrade/i);
});

test("re-requesting the same load does not burn a second slot or get blocked", async () => {
  const driver = driverAccount("usr_same_load");
  const { env } = await seedEnv([driver], [openLoad("load-a", "Atlanta, GA")]);

  const first = await claim(env, driver, "load-a");
  assert.equal(first.response.status, 200);

  const again = await claim(env, driver, "load-a");
  assert.equal(again.response.status, 200, JSON.stringify(again.body));
  assert.match(again.body.message, /already requested/i);
});

test("the legacy 8–12 type string maps to twelve slots", async () => {
  const pro = account("usr_pro_limit", {
    type: "Broker 8–12 trucks - $149.99/mo",
    paymentStatus: "paid_fleet_pro",
    subscriptionPriceCents: 14999,
  });
  const loads = Array.from({ length: 13 }, (_, i) =>
    openLoad(`load-${i}`, `City ${i}, GA`),
  );
  const { env } = await seedEnv([pro], loads);

  for (let i = 0; i < 12; i += 1) {
    const result = await claim(env, pro, `load-${i}`);
    assert.equal(result.response.status, 200, `load-${i}: ${JSON.stringify(result.body)}`);
  }
  const thirteenth = await claim(env, pro, "load-12");
  assert.equal(thirteenth.response.status, 403);
  assert.equal(thirteenth.body.planLimit, 12);
});
