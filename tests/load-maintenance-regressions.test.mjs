import test from "node:test";
import assert from "node:assert/strict";

import { onRequestGet, onRequestPost } from "../functions/api/loads.js";
import { createSession, upsertAccount, userIdKey } from "../functions/api/_auth.js";
import { SqliteD1 } from "./helpers/sqlite-d1.mjs";

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

function shipper(userId) {
  return {
    userId,
    email: `${userId}@example.com`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Regression Shipper",
    company: "Regression Shipper LLC",
    type: "Customer needing pickup - $9.99/mo",
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    loadAccess: "request_post",
    subscriptionAccess: "request_post",
  };
}

function carrier(userId) {
  return {
    userId,
    email: `${userId}@example.com`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Regression Carrier",
    company: "Regression Carrier LLC",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-23T00:00:00.000Z",
  };
}

async function setup(userId) {
  const kv = new MemoryKv();
  const account = shipper(userId);
  await kv.put(userIdKey(userId), JSON.stringify(account));
  const session = await createSession({ RELOCATION_MANAGER_LEADS: kv }, userId);
  return { kv, account, session };
}

function postBody(equipment = "26 ft box truck") {
  return {
    action: "post",
    from: "Seattle, WA",
    to: "Portland, OR",
    pickupDate: "2099-08-15",
    pickupTime: "09:00",
    equipment,
    weight: "2,000 lbs",
    commodity: "Palletized freight",
    dimensions: "8 ft x 4 ft x 5 ft",
    loadingHelp: "Driver assist requested",
    siteConditions: "Ground level, dock available",
    contactName: "Site Contact",
    contactPhone: "555-555-0100",
    rate: 500,
  };
}

async function post(env, session, body, origin = "https://relocationmanagerusa.com") {
  const csrf = "regression-csrf";
  return onRequestPost({
    request: new Request(`${origin}/api/loads`, {
      method: "POST",
      headers: {
        origin,
        cookie: `rm_session=${session}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify(body),
    }),
    env,
  });
}

test("successful www responses do not advertise credentialed cross-origin access", async () => {
  const { kv, session } = await setup("usr_www_regression");
  const response = await post(
    { RELOCATION_MANAGER_LEADS: kv },
    session,
    postBody(),
    "https://www.relocationmanagerusa.com",
  );
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
});

test("a rejected post does not delete photos still referenced by the live catalog", async () => {
  const { kv, account, session } = await setup("usr_cleanup_regression");
  const stalePhotoKey = "marketplace:load-photo:v1:stale-load:stale-photo";
  await kv.put(stalePhotoKey, "data:image/png;base64,AAAA");
  await kv.put(
    LOAD_STORE_KEY,
    JSON.stringify([
      {
        id: "stale-load",
        from: "Miami, FL",
        to: "Orlando, FL",
        pickupAt: "2020-01-01T09:00:00.000Z",
        expiresAt: "2020-01-02T09:00:00.000Z",
        eq: "26 ft box truck",
        status: "open",
        postedByUserId: account.userId,
        photos: [{ id: "stale-photo", type: "image/png", name: "old.png" }],
        claimRequests: [],
      },
      {
        id: "duplicate-load",
        from: "Seattle, WA",
        to: "Portland, OR",
        pickupAt: "2099-08-15T09:00:00.000Z",
        expiresAt: "2099-08-16T09:00:00.000Z",
        eq: "26 ft box truck",
        status: "open",
        postedByUserId: account.userId,
        photos: [],
        claimRequests: [],
      },
    ]),
  );

  const response = await post(
    { RELOCATION_MANAGER_LEADS: kv },
    session,
    postBody(),
  );
  assert.equal(response.status, 409);
  assert.notEqual(await kv.get(stalePhotoKey), null);
});

test("a dry van drop-and-hook load remains classified as dry van", async () => {
  const { kv, session } = await setup("usr_equipment_regression");
  const response = await post(
    { RELOCATION_MANAGER_LEADS: kv },
    session,
    postBody("53 ft dry van, drop & hook"),
  );
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.load.kind, "dryvan");
});

test("D1 acceptance overlays never exceed 100 bound parameters", async () => {
  const kv = new MemoryKv();
  const db = new SqliteD1();
  const account = carrier("usr_d1_limit_regression");
  const setupEnv = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: db,
  };
  await upsertAccount(setupEnv, account);
  const session = await createSession(setupEnv, account.userId);
  const loads = Array.from({ length: 101 }, (_, index) => ({
    id: `load-limit-${index}`,
    from: "Seattle, WA",
    to: "Portland, OR",
    pickupAt: "2099-08-15T09:00:00.000Z",
    expiresAt: "2099-08-16T09:00:00.000Z",
    eq: "53 ft dry van",
    kind: "dryvan",
    status: "open",
    postedByUserId: "usr_other_shipper",
    photos: [],
    claimRequests: [],
  }));
  await kv.put(LOAD_STORE_KEY, JSON.stringify(loads));

  const overlayBindCounts = [];
  const limitedDb = {
    prepare(sql) {
      const statement = db.prepare(sql);
      if (!String(sql).includes("FROM loads")) return statement;
      return {
        bind(...parameters) {
          overlayBindCounts.push(parameters.length);
          if (parameters.length > 100) {
            throw new Error("D1 permits at most 100 bound parameters");
          }
          return statement.bind(...parameters);
        },
      };
    },
  };

  const response = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads?limit=100", {
      headers: { cookie: `rm_session=${session}` },
    }),
    env: {
      RELOCATION_MANAGER_LEADS: kv,
      RELOCATION_MANAGER_DB: limitedDb,
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(overlayBindCounts, [100, 1]);
});
