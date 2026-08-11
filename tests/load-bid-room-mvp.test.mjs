import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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

function shipper(userId = "usr_room_shipper") {
  return {
    userId,
    email: `${userId}@example.invalid`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Shipper Room",
    company: "Shipper Room LLC",
    type: "Customer needing pickup (request-only) - $9.99/mo",
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    loadAccess: "request",
    subscriptionAccess: "request",
  };
}

function carrier(userId = "usr_room_carrier") {
  return {
    userId,
    email: `${userId}@example.invalid`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Carrier Room",
    company: "Carrier Room LLC",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-23T00:00:00.000Z",
    loadAccess: "claim",
    subscriptionAccess: "claim",
  };
}

async function seed(accounts) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  for (const acct of accounts) {
    await kv.put(userIdKey(acct.userId), JSON.stringify(acct));
  }
  await kv.put(LOAD_STORE_KEY, JSON.stringify([]));
  return { kv, env };
}

async function sessionFor(env, account) {
  return createSession(env, account.userId);
}

function headers(session, csrf = "room-csrf") {
  return {
    origin: "https://relocationmanagerusa.com",
    cookie: `rm_session=${session}; rm_csrf=${csrf}`,
    "content-type": "application/json",
    "x-csrf-token": csrf,
  };
}

async function postAction(env, session, body) {
  const response = await onRequestPost({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      method: "POST",
      headers: headers(session),
      body: JSON.stringify(body),
    }),
    env,
  });
  return { response, body: await response.json() };
}

const FULL = {
  from: "Atlanta, GA",
  to: "Marietta, GA",
  pickupDate: "2099-09-01",
  pickupTime: "09:00",
  equipment: "Cargo van",
  weight: "400 lbs",
  commodity: "1 pallet retail stock",
  dimensions: "48 x 40 x 50 in",
  loadingHelp: "Driver assist requested",
  siteConditions: "Ground level rear door",
  contactName: "Site Lead",
  contactPhone: "555-555-0199",
};

test("open_bids posts without a target rate", async () => {
  const poster = shipper();
  const { env } = await seed([poster]);
  const session = await sessionFor(env, poster);
  const { response, body } = await postAction(env, session, {
    action: "post",
    ...FULL,
    pricingMode: "open_bids",
    rate: 0,
    jobType: "pallet",
  });
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.load.pricingMode, "open_bids");
  assert.equal(body.load.rate, 0);
  assert.equal(body.route, "bid-room");
  assert.match(String(body.load.tags || []), /Open for bids/i);
});

test("target posts still require a positive rate", async () => {
  const poster = shipper("usr_room_shipper_target");
  const { env } = await seed([poster]);
  const session = await sessionFor(env, poster);
  const { response, body } = await postAction(env, session, {
    action: "post",
    ...FULL,
    pricingMode: "target",
    rate: 0,
  });
  assert.equal(response.status, 400, JSON.stringify(body));
  assert.match(body.error || "", /target rate|open for bids/i);
});

test("claim is rejected on open_bids loads; bid requires a note", async () => {
  const poster = shipper("usr_room_shipper_claim");
  const driver = carrier("usr_room_carrier_claim");
  const { env, kv } = await seed([poster, driver]);
  const posterSession = await sessionFor(env, poster);
  const posted = await postAction(env, posterSession, {
    action: "post",
    ...FULL,
    pricingMode: "open_bids",
    rate: 0,
  });
  assert.equal(posted.response.status, 201, JSON.stringify(posted.body));
  const loadId = posted.body.load.id;
  const driverSession = await sessionFor(env, driver);

  const claim = await postAction(env, driverSession, {
    action: "claim",
    loadId,
  });
  assert.equal(claim.response.status, 400, JSON.stringify(claim.body));
  assert.match(claim.body.error || "", /open for bids/i);

  const shortNote = await postAction(env, driverSession, {
    action: "bid",
    loadId,
    amount: 190,
    note: "too short",
  });
  assert.equal(shortNote.response.status, 400, JSON.stringify(shortNote.body));
  assert.match(shortNote.body.error || "", /includes|note/i);

  const bid = await postAction(env, driverSession, {
    action: "bid",
    loadId,
    amount: 225,
    note: "Cargo van · load/unload assist · 30 min wait included",
  });
  assert.equal(bid.response.status, 200, JSON.stringify(bid.body));
  assert.equal(bid.body.bid?.amount, 225);

  // Ensure catalog retained pricing mode and the bid note
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  const row = stored.find((item) => item.id === loadId);
  assert.equal(row.pricingMode, "open_bids");
  assert.equal(row.claimRequests?.[0]?.amount, 225);
  assert.match(row.claimRequests?.[0]?.note || "", /load\/unload assist/i);
});

test("member shell exposes bid room markup and pricing mode controls", async () => {
  const html = await readFile(new URL("../dist/member.html", import.meta.url), "utf8");
  const js = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");
  assert.match(html, /id="bid-room"/);
  assert.match(html, /name="pricing_mode"/);
  assert.match(html, /value="open_bids"/);
  assert.match(html, /id="bidRoomOffers"/);
  assert.match(js, /function renderBidRoom/);
  assert.match(js, /function openBidRoom/);
  assert.match(js, /pricingMode/);
  assert.match(js, /note\.length < 12/);
});
