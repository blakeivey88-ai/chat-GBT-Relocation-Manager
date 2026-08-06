import test from "node:test";
import assert from "node:assert/strict";

import { onRequestGet, onRequestPost } from "../functions/api/loads.js";
import {
  carrierLoadBookingDecision,
  carrierVerificationDecision,
  createSession,
  upsertAccount,
  userIdKey,
} from "../functions/api/_auth.js";

test("does not require DOT/MC when a carrier has no commercial authority", () => {
  const decision = carrierVerificationDecision({
    role: "Independent Driver",
    type: "Independent driver / self-insured",
    authorityRequired: false,
    insuranceStatus: "Verified",
    idCheckStatus: "Verified",
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.verified, true);
  assert.deepEqual(decision.missing, undefined);
});
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

function openLoad() {
  return {
    id: "load-authorization-test",
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 685,
    mi: 250,
    pick: "Tomorrow 8am",
    wt: "3,200 lbs",
    eq: "26 ft Box",
    kind: "box",
    status: "open",
    claimRequests: [],
  };
}

async function claimRequest(account) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  await kv.put(LOAD_STORE_KEY, JSON.stringify([openLoad()]));
  const session = await createSession(env, account.userId);
  const csrf = "load-authorization-test-csrf";
  const request = new Request("https://relocationmanagerusa.com/api/loads", {
    method: "POST",
    headers: {
      origin: "https://relocationmanagerusa.com",
      cookie: `rm_session=${session}; rm_csrf=${csrf}`,
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({
      action: "claim",
      loadId: "load-authorization-test",
    }),
  });

  const response = await onRequestPost({ request, env });
  const body = await response.json();
  const storedLoads = JSON.parse(await kv.get(LOAD_STORE_KEY));
  return { response, body, storedLoads };
}

async function assertShipperPostOnlyContract(accessValue) {
  const account = {
    userId: `usr_shipper_${accessValue}`,
    email: `${accessValue}@example.invalid`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: `${accessValue} Shipper`,
    company: `${accessValue} Shipper LLC`,
    role: "Customer / Shipper",
    type: "Customer needing pickup (request-only) - $9.99/mo",
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    subscriptionPriceCents: 999,
    loadAccess: accessValue,
    subscriptionAccess: accessValue,
  };
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  await kv.put(LOAD_STORE_KEY, JSON.stringify([openLoad()]));
  const session = await createSession(env, account.userId);
  const csrf = `shipper-${accessValue}-csrf`;
  const headers = {
    origin: "https://relocationmanagerusa.com",
    cookie: `rm_session=${session}; rm_csrf=${csrf}`,
    "content-type": "application/json",
    "x-csrf-token": csrf,
  };

  const postResponse = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "post",
        from: "Seattle, WA",
        to: "Portland, OR",
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
  const postBody = await postResponse.json();
  assert.equal(postResponse.status, 201, JSON.stringify(postBody));
  assert.equal(postBody.ok, true);

  const getResponse = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}`,
      },
    }),
    env,
  });
  const getBody = await getResponse.json();
  assert.equal(getResponse.status, 403, JSON.stringify(getBody));
  assert.equal(getBody.ok, false);

  const beforeClaim = await kv.get(LOAD_STORE_KEY);
  const claimResponse = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "claim",
        loadId: "load-authorization-test",
      }),
    }),
    env,
  });
  const claimBody = await claimResponse.json();
  assert.equal(claimResponse.status, 403, JSON.stringify(claimBody));
  assert.equal(claimBody.ok, false);
  assert.equal(await kv.get(LOAD_STORE_KEY), beforeClaim);
  const storedLoads = JSON.parse(beforeClaim);
  const target = storedLoads.find(
    (load) => load.id === "load-authorization-test",
  );
  assert.equal(target.claimRequests.length, 0);
  const storedAccount = JSON.parse(await kv.get(userIdKey(account.userId)));
  assert.equal(storedAccount.activePickups, undefined);
}

function activeVerifiedCarrier(overrides = {}) {
  return {
    userId: "usr_carrier_authorization_test",
    email: "carrier@example.com",
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    name: "Carrier Test",
    company: "Carrier Test LLC",
    role: "Owner-Operator",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

test("denies a shipper claim even when billing fields look like a carrier plan", async () => {
  const shipper = activeVerifiedCarrier({
    userId: "usr_shipper_authorization_test",
    email: "shipper@example.com",
    name: "Shipper Test",
    company: "Shipper Test LLC",
    role: "Customer / Shipper",
    type: "Customer needing pickup (request-only) - $9.99/mo",
    subscriptionPriceCents: 2999,
  });

  assert.equal(carrierLoadBookingDecision(shipper).allowed, false);

  const { response, body, storedLoads } = await claimRequest(shipper);
  assert.equal(response.status, 403, JSON.stringify(body));
  assert.equal(body.ok, false);
  assert.equal(storedLoads[0].claimRequests.length, 0);
});

test("explicit request access may post but cannot discover or claim loads", async () => {
  await assertShipperPostOnlyContract("request");
});

test("explicit post_only access may post but cannot discover or claim loads", async () => {
  await assertShipperPostOnlyContract("post_only");
});

test("allows an active verified carrier to request pickup", async () => {
  const { response, body, storedLoads } = await claimRequest(
    activeVerifiedCarrier(),
  );

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(storedLoads[0].claimRequests.length, 1);
  assert.equal(
    storedLoads[0].claimRequests[0].userId,
    "usr_carrier_authorization_test",
  );
});

test("paid carrier claim access may bid and publish a load", async () => {
  const account = activeVerifiedCarrier({
    userId: "usr_carrier_claim_only_test",
    email: "carrier-claim-only@example.invalid",
    loadAccess: "claim",
    subscriptionAccess: "claim",
  });
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  await kv.put(LOAD_STORE_KEY, JSON.stringify([]));
  const session = await createSession(env, account.userId);
  const csrf = "carrier-claim-only-csrf";
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
        miles: 175,
      }),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.load.postedByUserId, account.userId);
});

test("claim_post access can publish a load", async () => {
  const account = activeVerifiedCarrier({
    userId: "usr_carrier_claim_post_test",
    email: "carrier-claim-post@example.invalid",
    loadAccess: "claim_post",
    subscriptionAccess: "claim_post",
  });
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  await kv.put(LOAD_STORE_KEY, JSON.stringify([]));
  const session = await createSession(env, account.userId);
  const csrf = "carrier-claim-post-csrf";
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
        miles: 175,
      }),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.ok, true);
  assert.equal(body.load.postedByUserId, account.userId);
});

test("denies an expired carrier claim without mutating the load", async () => {
  const { response, body, storedLoads } = await claimRequest(
    activeVerifiedCarrier({
      paymentStatus: "expired",
      subscriptionStatus: "expired",
    }),
  );

  assert.equal(response.status, 403, JSON.stringify(body));
  assert.equal(body.ok, false);
  assert.equal(storedLoads[0].claimRequests.length, 0);
});

test("records an entitled member load view without exposing pickup responses", async () => {
  const viewer = activeVerifiedCarrier({
    userId: "usr_private_viewer",
    email: "private-viewer@example.com",
  });
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(viewer.userId), JSON.stringify(viewer));
  await kv.put(
    LOAD_STORE_KEY,
    JSON.stringify([
      {
        ...openLoad(),
        postedByUserId: "usr_private_poster",
        claimRequests: [
          {
            id: "claim_private",
            userId: "usr_private_requester",
            name: "Private Requester",
            company: "Private Carrier LLC",
            status: "pickup_requested",
            requestedAt: "2026-07-29T12:00:00.000Z",
          },
        ],
      },
    ]),
  );
  const session = await createSession(env, viewer.userId);
  const response = await onRequestGet({
    request: new Request(
      "https://relocationmanagerusa.com/api/loads?loadId=load-authorization-test",
      {
        headers: {
          origin: "https://relocationmanagerusa.com",
          cookie: `rm_session=${session}`,
        },
      },
    ),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(Object.hasOwn(body.load, "claimRequests"), false);
  assert.equal(Object.hasOwn(body.load, "acceptedByUserId"), false);
  const history = JSON.parse(
    await kv.get(`load-history:${viewer.userId}:v1`),
  );
  assert.equal(history.length, 1);
  assert.equal(history[0].eventType, "viewed");
  assert.equal(history[0].userId, viewer.userId);
  assert.equal(history[0].verified, false);
});

test("only the posting account can read responses and accept an eligible carrier", async () => {
  const poster = {
    userId: "usr_accepting_poster",
    email: "poster@example.com",
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Posting Member",
    company: "Posting Company",
    type: "Customer needing pickup (request-only) - $9.99/mo",
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    loadAccess: "request",
    subscriptionAccess: "request",
  };
  const carrier = activeVerifiedCarrier({
    userId: "usr_accepted_carrier",
    email: "accepted-carrier@example.com",
    activePickups: [
      {
        id: "load-authorization-test",
        loadId: "load-authorization-test",
        status: "Pickup requested",
        statusHistory: [
          {
            status: "Pickup requested",
            at: "2026-07-29T12:00:00.000Z",
          },
        ],
        serverAuthorized: true,
      },
    ],
  });
  const otherPoster = {
    ...poster,
    userId: "usr_other_poster",
    email: "other-poster@example.com",
  };
  const otherCarrier = activeVerifiedCarrier({
    userId: "usr_not_selected_carrier",
    email: "not-selected-carrier@example.com",
    activePickups: [
      {
        id: "load-authorization-test",
        loadId: "load-authorization-test",
        status: "Pickup requested",
        statusHistory: [],
        serverAuthorized: true,
      },
    ],
  });
  const kv = new MemoryKv();
  const env = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: new SqliteD1(),
  };
  for (const account of [poster, carrier, otherPoster, otherCarrier]) {
    await upsertAccount(env, account);
  }
  await kv.put(
    LOAD_STORE_KEY,
    JSON.stringify([
      {
        ...openLoad(),
        postedByUserId: poster.userId,
        claimRequests: [
          {
            id: "claim_accept_me",
            userId: carrier.userId,
            name: carrier.name,
            company: carrier.company,
            status: "pickup_requested",
            requestedAt: "2026-07-29T12:00:00.000Z",
          },
          {
            id: "claim_not_selected",
            userId: otherCarrier.userId,
            name: otherCarrier.name,
            company: otherCarrier.company,
            status: "pickup_requested",
            requestedAt: "2026-07-29T12:01:00.000Z",
          },
        ],
      },
    ]),
  );

  const posterSession = await createSession(env, poster.userId);
  const postedResponse = await onRequestGet({
    request: new Request(
      "https://relocationmanagerusa.com/api/loads?scope=posted",
      {
        headers: {
          origin: "https://relocationmanagerusa.com",
          cookie: `rm_session=${posterSession}`,
        },
      },
    ),
    env,
  });
  const postedBody = await postedResponse.json();
  assert.equal(postedResponse.status, 200, JSON.stringify(postedBody));
  assert.equal(postedBody.loads.length, 1);
  assert.equal(postedBody.loads[0].claimRequests.length, 2);

  const otherSession = await createSession(env, otherPoster.userId);
  const csrf = "accept-load-csrf";
  const deniedResponse = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${otherSession}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        action: "accept",
        loadId: "load-authorization-test",
        requestId: "claim_accept_me",
      }),
    }),
    env,
  });
  assert.equal(deniedResponse.status, 403);

  const acceptedResponse = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${posterSession}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        action: "accept",
        loadId: "load-authorization-test",
        requestId: "claim_accept_me",
      }),
    }),
    env,
  });
  const acceptedBody = await acceptedResponse.json();
  assert.equal(acceptedResponse.status, 200, JSON.stringify(acceptedBody));
  assert.equal(acceptedBody.load.status, "accepted");
  assert.equal(acceptedBody.load.claimRequests[0].status, "accepted");

  const storedLoads = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(storedLoads[0].acceptedByUserId, carrier.userId);
  const storedCarrier = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(carrier.userId)
    .first();
  assert.equal(JSON.parse(storedCarrier.active_pickups)[0].status, "Confirmed");
  const storedOtherCarrier = JSON.parse(
    await kv.get(userIdKey(otherCarrier.userId)),
  );
  assert.equal(storedOtherCarrier.activePickups[0].status, "Not selected");
  const posterHistory = JSON.parse(
    await kv.get(`load-history:${poster.userId}:v1`),
  );
  const carrierHistory = JSON.parse(
    await kv.get(`load-history:${carrier.userId}:v1`),
  );
  assert.equal(posterHistory[0].eventType, "accepted");
  assert.equal(carrierHistory[0].eventType, "accepted");
});
