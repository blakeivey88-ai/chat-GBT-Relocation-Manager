import test from "node:test";
import assert from "node:assert/strict";

import { onRequestGet, onRequestPost } from "../functions/api/loads.js";
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

async function seedEnv(accounts) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  for (const acct of accounts) {
    await kv.put(userIdKey(acct.userId), JSON.stringify(acct));
  }
  await kv.put(LOAD_STORE_KEY, JSON.stringify([]));
  return { kv, env };
}

async function postLoad(env, acct, from, to) {
  const session = await createSession(env, acct.userId);
  const csrf = `${acct.userId}-csrf`;
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        action: "post",
        from,
        to,
        pickupDate: "2099-08-15",
        pickupTime: "09:00",
        equipment: "26 ft box truck",
        weight: "2,000 lbs",
        commodity: "Palletized freight",
        dimensions: "8 ft x 4 ft x 5 ft",
        loadingHelp: "Driver assist requested",
        siteConditions: "Ground level, dock available",
        contactName: "Site Contact",
        contactPhone: "555-555-0100",
        rate: 750,
        miles: 175,
      }),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  return { session, body };
}

async function listLoads(env, acct) {
  const session = await createSession(env, acct.userId);
  const response = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}`,
      },
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

test("pro and dispatcher posts get priority placement above newer standard posts", async () => {
  const starter = account("usr_starter");
  const pro = account("usr_pro", {
    type: "Broker 8–12 trucks - $149.99/mo",
    paymentStatus: "paid_fleet_pro",
    subscriptionPriceCents: 14999,
  });
  const dispatcher = account("usr_dispatcher", {
    type: "Dispatcher / broker - $189.99/mo",
    paymentStatus: "paid_dispatcher_broker",
    subscriptionPriceCents: 18999,
  });
  const { env } = await seedEnv([starter, pro, dispatcher]);

  // Pro posts first, then dispatcher, then starter posts LAST (newest).
  const proPost = await postLoad(env, pro, "Miami, FL", "Atlanta, GA");
  const dispatcherPost = await postLoad(env, dispatcher, "Dallas, TX", "Houston, TX");
  const starterPost = await postLoad(env, starter, "Tampa, FL", "Orlando, FL");

  assert.equal(proPost.body.load.priority, 1);
  assert.equal(dispatcherPost.body.load.priority, 1);
  assert.equal(starterPost.body.load.priority, 0);

  const listing = await listLoads(env, starter);
  const order = listing.loads.map((load) => load.postedByUserId);

  // Both priority posts rank above the newer standard post; newest-first within rank.
  assert.deepEqual(order, ["usr_dispatcher", "usr_pro", "usr_starter"]);
});

test("legacy 7–12 account type still earns priority placement", async () => {
  const legacyPro = account("usr_legacy_pro", {
    type: "Broker 7–12 trucks - $149.99/mo",
    paymentStatus: "",
  });
  const { env } = await seedEnv([legacyPro]);
  const posted = await postLoad(env, legacyPro, "Denver, CO", "Salt Lake City, UT");
  assert.equal(posted.body.load.priority, 1);
});

test("standard posts keep newest-first ordering among themselves", async () => {
  const a = account("usr_a");
  const b = account("usr_b");
  const { env } = await seedEnv([a, b]);
  await postLoad(env, a, "Boise, ID", "Spokane, WA");
  await new Promise((resolve) => setTimeout(resolve, 5));
  await postLoad(env, b, "Reno, NV", "Sacramento, CA");
  const listing = await listLoads(env, a);
  const order = listing.loads.map((load) => load.postedByUserId);
  assert.deepEqual(order, ["usr_b", "usr_a"]);
});
