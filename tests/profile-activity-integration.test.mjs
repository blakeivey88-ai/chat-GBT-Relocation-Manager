import test from "node:test";
import assert from "node:assert/strict";

import { onRequestGet as getAccount } from "../functions/api/account.js";
import { onRequestPost as mutateLoads } from "../functions/api/loads.js";
import {
  createSession,
  userIdKey,
} from "../functions/api/_auth.js";

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

function account(overrides = {}) {
  return {
    userId: "usr_profile_activity",
    email: "profile-activity@example.com",
    emailVerifiedAt: "2026-07-29T12:00:00.000Z",
    profileComplete: true,
    name: "Profile Activity",
    company: "Profile Activity LLC",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-29T12:00:00.000Z",
    ...overrides,
  };
}

async function signedRequest(env, member, url = "/api/account") {
  await env.RELOCATION_MANAGER_LEADS.put(
    userIdKey(member.userId),
    JSON.stringify(member),
  );
  const session = await createSession(env, member.userId);
  return {
    session,
    request: new Request(`https://relocationmanagerusa.com${url}`, {
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}`,
      },
    }),
  };
}

test("account history is returned only to its entitled signed-in owner", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const entitled = account();
  await kv.put(
    `load-history:${entitled.userId}:v1`,
    JSON.stringify([
      {
        id: "load-1:posted:usr_profile_activity",
        userId: entitled.userId,
        loadId: "load-1",
        eventType: "posted",
        title: "Atlanta → Nashville",
        occurredAt: "2026-07-29T12:00:00.000Z",
      },
    ]),
  );
  const signed = await signedRequest(env, entitled);
  const entitledResponse = await getAccount({
    request: signed.request,
    env,
  });
  const entitledBody = await entitledResponse.json();
  assert.equal(entitledResponse.status, 200, JSON.stringify(entitledBody));
  assert.equal(entitledBody.loadHistory.length, 1);
  assert.equal(entitledBody.loadHistory[0].userId, entitled.userId);

  const unpaid = account({
    userId: "usr_profile_unpaid",
    email: "profile-unpaid@example.com",
    paymentStatus: "unpaid_waitlist",
    subscriptionStatus: "unpaid",
  });
  await kv.put(
    `load-history:${unpaid.userId}:v1`,
    JSON.stringify([
      {
        id: "private-unpaid-history",
        userId: unpaid.userId,
        loadId: "private-load",
        eventType: "posted",
      },
    ]),
  );
  const unpaidSigned = await signedRequest(env, unpaid);
  const unpaidResponse = await getAccount({
    request: unpaidSigned.request,
    env,
  });
  const unpaidBody = await unpaidResponse.json();
  assert.equal(unpaidResponse.status, 200, JSON.stringify(unpaidBody));
  assert.equal(Object.hasOwn(unpaidBody, "loadHistory"), false);

  const anonymousResponse = await getAccount({
    request: new Request("https://relocationmanagerusa.com/api/account"),
    env,
  });
  const anonymousBody = await anonymousResponse.json();
  assert.equal(anonymousResponse.status, 200);
  assert.equal(anonymousBody.profile, null);
  assert.equal(Object.hasOwn(anonymousBody, "loadHistory"), false);
});

test("posting a load writes history to D1 and KV before account hydration", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const member = account();
  const signed = await signedRequest(env, member);
  const d1Writes = [];
  env.RELOCATION_MANAGER_DB = {
    prepare(sql) {
      return {
        async first() {
          if (/marketplace_state/i.test(sql)) throw new Error("no such table: marketplace_state");
          return null;
        },
        bind(...values) {
          if (!/INSERT INTO load_history/i.test(sql)) {
            return {
              async first() {
                return null;
              },
              async all() {
                throw new Error("Use the compatibility history store in this test.");
              },
            };
          }
          return {
            async run() {
              d1Writes.push({ sql, values });
              return { success: true };
            },
          };
        },
      };
    },
  };
  const csrf = "profile-post-history-csrf";
  const response = await mutateLoads({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${signed.session}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        action: "post",
        from: "Atlanta, GA",
        to: "Nashville, TN",
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
      }),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(d1Writes.length, 1);
  assert.match(d1Writes[0].sql, /INSERT INTO load_history/);
  const kvHistory = JSON.parse(
    await kv.get(`load-history:${member.userId}:v1`),
  );
  assert.equal(kvHistory.length, 1);
  assert.equal(kvHistory[0].eventType, "posted");
  assert.equal(kvHistory[0].loadId, body.load.id);

  const hydratedResponse = await getAccount({
    request: signed.request,
    env,
  });
  const hydrated = await hydratedResponse.json();
  assert.equal(hydratedResponse.status, 200, JSON.stringify(hydrated));
  assert.equal(hydrated.loadHistory[0].loadId, body.load.id);
});
