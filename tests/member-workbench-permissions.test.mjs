import test from "node:test";
import assert from "node:assert/strict";

import { onRequestGet, onRequestPost } from "../functions/api/loads.js";
import {
  carrierBookingPriceCents,
  carrierLoadBookingDecision,
  createSession,
  ensureAccountShape,
  readAccountByUserId,
  upsertAccount,
  userIdKey,
} from "../functions/api/_auth.js";

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

class EvidenceD1 {
  constructor(accountRow, verificationRow = null) {
    this.accountRow = accountRow;
    this.verificationRow = verificationRow;
  }

  prepare(sql) {
    const database = this;
    return {
      bind() {
        return this;
      },
      async first() {
        if (/\bFROM accounts\b/i.test(sql)) return database.accountRow;
        if (/\bFROM carrier_verifications\b/i.test(sql)) {
          return database.verificationRow;
        }
        return null;
      },
      async all() {
        return { results: [] };
      },
    };
  }
}

function d1AccountRow(account) {
  return {
    user_id: account.userId,
    email: account.email,
    name: account.name,
    company: account.company,
    type: account.type,
    role: account.role,
    email_verified_at: account.emailVerifiedAt,
    payment_status: account.paymentStatus,
    subscription_status: account.subscriptionStatus,
    subscription_access: account.subscriptionAccess || "claim_post",
    plan_label: account.planLabel,
    load_access: account.loadAccess || "claim_post",
    created_at: "2026-07-24T00:00:00.000Z",
    updated_at: "2026-07-24T00:00:00.000Z",
  };
}

function mixedShipperAccount() {
  return {
    userId: "usr_mixed_shipper_entitlement",
    email: "mixed-shipper@example.invalid",
    emailVerifiedAt: "2026-07-24T00:00:00.000Z",
    profileComplete: true,
    name: "Mixed Billing Test",
    company: "Mixed Billing Test LLC",
    role: "Owner-Operator",
    type: "Independent driver / self-insured - $29.99/mo",
    planLabel: "Independent Driver $29.99",
    subscriptionPriceCents: 2999,
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-24T00:00:00.000Z",
  };
}

function activeCarrierAccount() {
  return {
    userId: "usr_load_round_trip_carrier",
    email: "round-trip-carrier@example.invalid",
    emailVerifiedAt: "2026-07-24T00:00:00.000Z",
    profileComplete: true,
    name: "Round Trip Carrier",
    company: "Round Trip Carrier LLC",
    role: "Owner-Operator",
    type: "Independent driver / self-insured - $29.99/mo",
    planLabel: "Independent Driver $29.99",
    subscriptionPriceCents: 2999,
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-24T00:00:00.000Z",
  };
}

async function authenticatedContext(account) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  const session = await createSession(env, account.userId);
  return { kv, env, session };
}

function requestHeaders(session, csrf = "") {
  const headers = {
    origin: "https://relocationmanagerusa.com",
    cookie: `rm_session=${session}${csrf ? `; rm_csrf=${csrf}` : ""}`,
  };
  if (csrf) {
    headers["content-type"] = "application/json";
    headers["x-csrf-token"] = csrf;
  }
  return headers;
}

test("authoritative $9.99 billing denies a mixed carrier-looking account", async () => {
  const account = mixedShipperAccount();
  const decision = carrierLoadBookingDecision(account);
  assert.equal(carrierBookingPriceCents(account), 999);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "Shipper plan is post-only.");
  assert.match(decision.message, /\$9\.99 Shipper plan is post-only/);

  const { env, session } = await authenticatedContext(account);
  const response = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      headers: requestHeaders(session),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 403, JSON.stringify(body));
  assert.equal(body.ok, false);
  assert.match(body.error, /\$9\.99 Shipper plan is post-only/);
});

test("carrier verification denial names each missing requirement", () => {
  const decision = carrierLoadBookingDecision({
    ...activeCarrierAccount(),
    carrierVerifiedAt: "",
    dotMcStatus: "Verified",
    insuranceStatus: "Not submitted",
    idCheckStatus: "Pending",
  });

  assert.equal(decision.allowed, false);
  assert.deepEqual(decision.missing, ["insurance", "identity"]);
  assert.equal(
    decision.message,
    "To open the Load Board, complete: insurance proof, identity verification.",
  );
});

test("request-only subscription access denies a stale carrier-looking account", async () => {
  const account = {
    ...activeCarrierAccount(),
    userId: "usr_stale_request_subscription",
    loadAccess: "claim_post",
    subscriptionAccess: "request_post",
  };
  const decision = carrierLoadBookingDecision(account);
  assert.equal(carrierBookingPriceCents(account), 999);
  assert.equal(decision.allowed, false);

  const { kv, env, session } = await authenticatedContext(account);
  await kv.put(LOAD_STORE_KEY, JSON.stringify([{
    id: "stale-subscription-load", from: "Atlanta, GA", to: "Nashville, TN",
    rate: 685, mi: 250, pick: "Tomorrow 8am", wt: "3,200 lbs",
    eq: "26 ft Box", kind: "box", status: "open", claimRequests: [],
  }]));
  const get = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads", { headers: requestHeaders(session) }), env,
  });
  assert.equal(get.status, 403, await get.text());
  const csrf = "stale-request-subscription-csrf";
  const claim = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST", headers: requestHeaders(session, csrf),
      body: JSON.stringify({ action: "claim", loadId: "stale-subscription-load" }),
    }), env,
  });
  assert.equal(claim.status, 403, await claim.text());
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].claimRequests.length, 0);
});

test("account persistence preserves authoritative price and carrier verification evidence", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const shipper = ensureAccountShape({
    ...mixedShipperAccount(),
    paymentStatus: "paid_driver",
    subscriptionPriceCents: 999,
  });
  assert.equal(shipper.subscriptionPriceCents, 999);
  assert.equal(carrierBookingPriceCents(shipper), 999);
  await upsertAccount(env, shipper);
  const storedShipper = await readAccountByUserId(env, shipper.userId);
  assert.equal(storedShipper.subscriptionPriceCents, 999);
  assert.equal(carrierLoadBookingDecision(storedShipper).allowed, false);

  const carrier = ensureAccountShape(activeCarrierAccount());
  assert.equal(carrier.carrierVerifiedAt, "2026-07-24T00:00:00.000Z");
  await upsertAccount(env, carrier);
  const storedCarrier = await readAccountByUserId(env, carrier.userId);
  assert.equal(
    storedCarrier.carrierVerifiedAt,
    "2026-07-24T00:00:00.000Z",
  );
  assert.equal(carrierBookingPriceCents(storedCarrier), 2999);
  assert.equal(carrierLoadBookingDecision(storedCarrier).allowed, true);
});

test("D1 hydration restores authoritative price and verification evidence", async () => {
  const carrier = activeCarrierAccount();
  const carrierKv = new MemoryKv();
  await carrierKv.put(
    userIdKey(carrier.userId),
    JSON.stringify({ ...carrier, carrierVerifiedAt: "" }),
  );
  const carrierEnv = {
    RELOCATION_MANAGER_LEADS: carrierKv,
    RELOCATION_MANAGER_DB: new EvidenceD1(d1AccountRow(carrier), {
      status: "approved",
      updated_at: "2026-07-24T01:00:00.000Z",
      created_at: "2026-07-24T00:30:00.000Z",
    }),
  };
  const hydratedCarrier = await readAccountByUserId(
    carrierEnv,
    carrier.userId,
  );
  assert.equal(
    hydratedCarrier.carrierVerifiedAt,
    "2026-07-24T01:00:00.000Z",
  );
  assert.equal(carrierLoadBookingDecision(hydratedCarrier).allowed, true);

  const shipper = {
    ...carrier,
    userId: "usr_d1_direct_999",
    email: "d1-direct-999@example.invalid",
    carrierVerifiedAt: "2026-07-24T00:00:00.000Z",
  };
  const shipperKv = new MemoryKv();
  await shipperKv.put(
    userIdKey(shipper.userId),
    JSON.stringify({ ...shipper, subscriptionPriceCents: 999 }),
  );
  const shipperEnv = {
    RELOCATION_MANAGER_LEADS: shipperKv,
    RELOCATION_MANAGER_DB: new EvidenceD1(d1AccountRow(shipper)),
  };
  const hydratedShipper = await readAccountByUserId(
    shipperEnv,
    shipper.userId,
  );
  assert.equal(hydratedShipper.subscriptionPriceCents, 999);
  assert.equal(carrierLoadBookingDecision(hydratedShipper).allowed, false);
});

test("mixed $9.99 billing cannot claim and does not mutate the load", async () => {
  const account = mixedShipperAccount();
  const { kv, env, session } = await authenticatedContext(account);
  await kv.put(
    LOAD_STORE_KEY,
    JSON.stringify([
      {
        id: "mixed-entitlement-load",
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
      },
    ]),
  );
  const csrf = "mixed-entitlement-csrf";
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: requestHeaders(session, csrf),
      body: JSON.stringify({
        action: "claim",
        loadId: "mixed-entitlement-load",
      }),
    }),
    env,
  });
  const body = await response.json();
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(response.status, 403, JSON.stringify(body));
  assert.equal(body.ok, false);
  assert.match(body.error, /\$9\.99 Shipper plan is post-only/);
  assert.equal(stored[0].claimRequests.length, 0);
});

test("admin email cannot bypass authoritative $9.99 shipper claim denial", async () => {
  const account = {
    ...mixedShipperAccount(),
    userId: "usr_admin_email_mixed_shipper",
    email: "blakeivey88@gmail.com",
    checkoutPlan: "shipper",
    paymentStatus: "paid_shipper",
    subscriptionPriceCents: 999,
  };
  const decision = carrierLoadBookingDecision(account);
  assert.equal(carrierBookingPriceCents(account), 999);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "Shipper plan is post-only.");

  const legitimateAdminCarrier = {
    ...activeCarrierAccount(),
    userId: "usr_admin_email_active_carrier",
    email: "blakeivey88@gmail.com",
  };
  assert.equal(carrierBookingPriceCents(legitimateAdminCarrier), 2999);
  assert.equal(carrierLoadBookingDecision(legitimateAdminCarrier).allowed, true);

  const { kv, env, session } = await authenticatedContext(account);
  await kv.put(
    LOAD_STORE_KEY,
    JSON.stringify([
      {
        id: "admin-email-mixed-shipper-load",
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
      },
    ]),
  );
  const csrf = "admin-email-mixed-shipper-csrf";
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: requestHeaders(session, csrf),
      body: JSON.stringify({
        action: "claim",
        loadId: "admin-email-mixed-shipper-load",
      }),
    }),
    env,
  });
  const body = await response.json();
  const storedLoads = JSON.parse(await kv.get(LOAD_STORE_KEY));
  const storedAccount = JSON.parse(await kv.get(userIdKey(account.userId)));
  assert.equal(response.status, 403, JSON.stringify(body));
  assert.equal(body.ok, false);
  assert.match(body.error, /\$9\.99 Shipper plan is post-only/);
  assert.equal(storedLoads[0].claimRequests.length, 0);
  assert.equal(storedAccount.activePickups, undefined);
});

test("$9.99 shipper remains allowed to post a pickup", async () => {
  const account = mixedShipperAccount();
  const { env, session } = await authenticatedContext(account);
  const csrf = "shipper-post-csrf";
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: requestHeaders(session, csrf),
      body: JSON.stringify({
        action: "post",
        from: "Seattle, WA",
        to: "Portland, OR",
        pickupDate: "2026-08-15",
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
});

test("load facts survive post storage, GET round-trip, and claim mutation", async () => {
  const account = activeCarrierAccount();
  const { kv, env, session } = await authenticatedContext(account);
  const csrf = "load-round-trip-csrf";
  const facts = {
    lastConfirmedAt: "2026-07-24T15:30:00.000Z",
    confirmedAt: "2026-07-24T15:00:00.000Z",
    verificationStatus: "Details supplied",
    paymentTerms: "Net 30",
    dock: true,
    forklift: true,
  };
  const postResponse = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: requestHeaders(session, csrf),
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
        ...facts,
      }),
    }),
    env,
  });
  const posted = await postResponse.json();
  assert.equal(postResponse.status, 201, JSON.stringify(posted));
  assert.deepEqual(
    {
      lastConfirmedAt: posted.load.lastConfirmedAt,
      confirmedAt: posted.load.confirmedAt,
      verificationStatus: posted.load.verificationStatus,
      paymentTerms: posted.load.paymentTerms,
      dock: posted.load.dock,
      forklift: posted.load.forklift,
    },
    facts,
  );

  const getResponse = await onRequestGet({
    request: new Request(
      `https://relocationmanagerusa.com/api/loads?loadId=${posted.load.id}`,
      { headers: requestHeaders(session) },
    ),
    env,
  });
  const fetched = await getResponse.json();
  assert.equal(getResponse.status, 200, JSON.stringify(fetched));
  for (const [key, value] of Object.entries(facts)) {
    assert.equal(fetched.load[key], value, key);
  }

  const claimResponse = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: requestHeaders(session, csrf),
      body: JSON.stringify({
        action: "claim",
        loadId: posted.load.id,
      }),
    }),
    env,
  });
  const claimed = await claimResponse.json();
  assert.equal(claimResponse.status, 200, JSON.stringify(claimed));
  assert.equal(claimed.activePickup.loadId, posted.load.id);
  assert.equal(claimed.activePickup.serverAuthorized, true);
  for (const [key, value] of Object.entries(facts)) {
    assert.equal(claimed.load[key], value, key);
  }
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  for (const [key, value] of Object.entries(facts)) {
    assert.equal(stored[0][key], value, key);
  }
  assert.equal(stored[0].claimRequests.length, 1);
  const storedCarrier = JSON.parse(await kv.get(userIdKey(account.userId)));
  assert.equal(storedCarrier.activePickups.length, 1);
  assert.equal(storedCarrier.activePickups[0].loadId, posted.load.id);
  assert.equal(storedCarrier.activePickups[0].serverAuthorized, true);

  const postVariant = async (suffix, siteFacts) => {
    const response = await onRequestPost({
      request: new Request("https://relocationmanagerusa.com/api/loads", {
        method: "POST",
        headers: requestHeaders(session, csrf),
        body: JSON.stringify({
          action: "post",
          from: `Seattle ${suffix}, WA`,
          to: "Portland, OR",
          pickupDate: "2099-08-16",
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
          ...siteFacts,
        }),
      }),
      env,
    });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    return body.load;
  };
  const explicitNo = await postVariant("No Access", {
    dock: false,
    forklift: false,
  });
  assert.equal(explicitNo.dock, false);
  assert.equal(explicitNo.forklift, false);
  const missingAccess = await postVariant("Unknown Access", {});
  assert.equal(missingAccess.dock, null);
  assert.equal(missingAccess.forklift, null);
});

test("member posts cannot invent platform verification or future confirmation", async () => {
  const account = activeCarrierAccount();
  const { env, session } = await authenticatedContext(account);
  const csrf = "load-provenance-csrf";
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: requestHeaders(session, csrf),
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
        verificationStatus: "Verified by platform",
        lastConfirmedAt: "2099-08-15T09:00:00.000Z",
        confirmedAt: "2099-08-15T09:00:00.000Z",
      }),
    }),
    env,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.load.verificationStatus, "Member supplied");
  assert.equal(body.load.lastConfirmedAt, "");
  assert.equal(body.load.confirmedAt, "");
});
