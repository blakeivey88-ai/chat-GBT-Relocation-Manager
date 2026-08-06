import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { onRequestGet, onRequestPost } from "../functions/api/loads.js";
import { createSession, upsertAccount, userIdKey } from "../functions/api/_auth.js";
import { SqliteD1 } from "./helpers/sqlite-d1.mjs";

const LOAD_STORE_KEY = "marketplace:loads:v1";
const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

class MemoryKv {
  constructor() {
    this.values = new Map();
    this.failLoadPuts = 0;
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    if (key === LOAD_STORE_KEY && this.failLoadPuts > 0) {
      this.failLoadPuts -= 1;
      throw new Error("Injected marketplace load mirror failure");
    }
    this.values.set(key, String(value));
  }
  async delete(key) {
    this.values.delete(key);
  }
}

function shipper(userId = "usr_bid_shipper") {
  return {
    userId,
    email: `${userId}@example.com`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Shipper Test",
    company: "Shipper Test LLC",
    type: "Customer needing pickup (request-only) - $9.99/mo",
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    loadAccess: "request",
    subscriptionAccess: "request",
  };
}

function carrier(userId = "usr_bid_carrier", overrides = {}) {
  return {
    userId,
    email: `${userId}@example.com`,
    emailVerifiedAt: "2026-07-23T00:00:00.000Z",
    profileComplete: true,
    name: "Carrier Test",
    company: "Carrier Test LLC",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    carrierVerifiedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

async function sessionFor(env, account) {
  if (env.RELOCATION_MANAGER_DB) await upsertAccount(env, account);
  else {
    await env.RELOCATION_MANAGER_LEADS.put(
      userIdKey(account.userId),
      JSON.stringify(account),
    );
  }
  return createSession(env, account.userId);
}

function headers(session, csrf = "bid-test-csrf") {
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

function openLoad(posterUserId = "usr_bid_shipper") {
  return {
    id: "load-bid-test",
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 500,
    mi: 250,
    pick: "Aug 15, 2099, 9:00 AM UTC",
    pickupAt: "2099-08-15T09:00:00.000Z",
    expiresAt: "2099-08-16T09:00:00.000Z",
    wt: "3,200 lbs",
    eq: "26 ft Box",
    kind: "box",
    status: "open",
    postedByUserId: posterUserId,
    broker: "Shipper Test LLC",
    claimRequests: [],
  };
}

test("a shipper can attach validated freight photos without embedding them in the load list", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const poster = shipper("usr_photo_poster");
  const posterSession = await sessionFor(env, poster);
  const posted = await postAction(env, posterSession, {
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
    rate: 500,
    photos: [
      {
        name: "freight.png",
        type: "image/png",
        alt: "Wrapped pallet at pickup",
        dataUrl: ONE_PIXEL_PNG,
      },
    ],
  });
  assert.equal(posted.response.status, 201, JSON.stringify(posted.body));
  assert.equal(posted.body.load.photos.length, 1);
  assert.equal(Object.hasOwn(posted.body.load.photos[0], "dataUrl"), false);
  const storedLoads = JSON.parse(await kv.get(LOAD_STORE_KEY));
  const photo = storedLoads[0].photos[0];
  const photoKey = `marketplace:load-photo:v1:${storedLoads[0].id}:${photo.id}`;
  assert.equal(await kv.get(photoKey), ONE_PIXEL_PNG);

  const viewer = carrier("usr_photo_viewer");
  const viewerSession = await sessionFor(env, viewer);
  const response = await onRequestGet({
    request: new Request(
      `https://relocationmanagerusa.com/api/loads?loadId=${storedLoads[0].id}&photoId=${photo.id}`,
      { headers: { cookie: `rm_session=${viewerSession}` } },
    ),
    env,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.ok((await response.arrayBuffer()).byteLength > 20);

  const unrelatedShipperSession = await sessionFor(env, shipper("usr_photo_outsider"));
  const denied = await onRequestGet({
    request: new Request(
      `https://relocationmanagerusa.com/api/loads?loadId=${storedLoads[0].id}&photoId=${photo.id}`,
      { headers: { cookie: `rm_session=${unrelatedShipperSession}` } },
    ),
    env,
  });
  assert.equal(denied.status, 403);
});

test("the $9.99 shipper tier cannot bid on loads", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(LOAD_STORE_KEY, JSON.stringify([openLoad("usr_other_shipper")]));
  const session = await sessionFor(env, shipper("usr_blocked_bidder"));
  const result = await postAction(env, session, {
    action: "bid",
    loadId: "load-bid-test",
    amount: 650,
  });
  assert.equal(result.response.status, 403);
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].claimRequests.length, 0);
});

test("an eligible carrier can submit and revise one private bid", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const poster = shipper();
  const bidder = carrier();
  await kv.put(LOAD_STORE_KEY, JSON.stringify([openLoad(poster.userId)]));
  const posterSession = await sessionFor(env, poster);
  const bidderSession = await sessionFor(env, bidder);
  const first = await postAction(env, bidderSession, {
    action: "bid",
    loadId: "load-bid-test",
    amount: 650,
    note: "Includes liftgate and driver assist.",
  });
  assert.equal(first.response.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.bid.amount, 650);

  const revised = await postAction(env, bidderSession, {
    action: "bid",
    loadId: "load-bid-test",
    amount: 625,
    note: "Can load Tuesday morning.",
  });
  assert.equal(revised.response.status, 200, JSON.stringify(revised.body));
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].claimRequests.length, 1);
  assert.equal(stored[0].claimRequests[0].amount, 625);

  const ownerResponse = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads?scope=posted", {
      headers: { cookie: `rm_session=${posterSession}` },
    }),
    env,
  });
  const ownerBody = await ownerResponse.json();
  assert.equal(ownerBody.loads[0].claimRequests[0].amount, 625);

  const otherCarrier = carrier("usr_other_bidder");
  const otherSession = await sessionFor(env, otherCarrier);
  const otherResponse = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads?loadId=load-bid-test", {
      headers: { cookie: `rm_session=${otherSession}` },
    }),
    env,
  });
  const otherBody = await otherResponse.json();
  assert.equal(Object.hasOwn(otherBody.load, "claimRequests"), false);
  assert.equal(Object.hasOwn(otherBody.load, "myBid"), false);
});

test("the posting shipper can decline a bid or accept it at the agreed rate", async () => {
  const kv = new MemoryKv();
  const env = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: new SqliteD1(),
  };
  const poster = shipper();
  const bidder = carrier();
  await kv.put(LOAD_STORE_KEY, JSON.stringify([openLoad(poster.userId)]));
  const posterSession = await sessionFor(env, poster);
  const bidderSession = await sessionFor(env, bidder);
  await postAction(env, bidderSession, {
    action: "bid",
    loadId: "load-bid-test",
    amount: 650,
    note: "All-in with liftgate.",
  });
  let stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  const bidId = stored[0].claimRequests[0].id;
  const declined = await postAction(env, posterSession, {
    action: "decline",
    loadId: "load-bid-test",
    requestId: bidId,
  });
  assert.equal(declined.response.status, 200, JSON.stringify(declined.body));
  stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].status, "open");
  assert.equal(stored[0].claimRequests[0].status, "declined");

  await postAction(env, bidderSession, {
    action: "bid",
    loadId: "load-bid-test",
    amount: 675,
    note: "Revised after route review.",
  });
  const accepted = await postAction(env, posterSession, {
    action: "accept",
    loadId: "load-bid-test",
    requestId: bidId,
  });
  assert.equal(accepted.response.status, 200, JSON.stringify(accepted.body));
  assert.equal(accepted.body.load.agreedRate, 675);
  assert.equal(accepted.body.load.rate, 500);
  stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].status, "accepted");
  assert.equal(stored[0].agreedRate, 675);
  const storedCarrier = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(bidder.userId)
    .first();
  storedCarrier.activePickups = JSON.parse(storedCarrier.active_pickups);
  assert.equal(storedCarrier.activePickups[0].rate, 675);
  assert.equal(storedCarrier.activePickups[0].postedRate, 500);

  const duplicateAccept = await postAction(env, posterSession, {
    action: "accept",
    loadId: "load-bid-test",
    requestId: bidId,
  });
  assert.equal(duplicateAccept.response.status, 200);
  assert.match(duplicateAccept.body.message, /already accepted/i);
});

test("acceptance fails closed when the bidder has no open truck slot", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const poster = shipper();
  const bidder = carrier("usr_full_bidder", {
    activePickups: [
      {
        id: "another-load",
        loadId: "another-load",
        status: "Confirmed",
        serverAuthorized: true,
      },
    ],
  });
  const load = openLoad(poster.userId);
  load.claimRequests = [
    {
      id: "bid_full",
      userId: bidder.userId,
      amount: 650,
      status: "pending",
      requestedAt: "2026-08-01T12:00:00.000Z",
    },
  ];
  await kv.put(LOAD_STORE_KEY, JSON.stringify([load]));
  const posterSession = await sessionFor(env, poster);
  await sessionFor(env, bidder);
  const accepted = await postAction(env, posterSession, {
    action: "accept",
    loadId: load.id,
    requestId: "bid_full",
  });
  assert.equal(accepted.response.status, 409);
  assert.equal(accepted.body.reason, "plan_concurrency_limit");
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].status, "open");
});

test("a prior not-selected pickup does not consume the carrier truck slot", async () => {
  const kv = new MemoryKv();
  const env = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: new SqliteD1(),
  };
  const poster = shipper("usr_released_slot_shipper");
  const bidder = carrier("usr_released_slot_carrier", {
    activePickups: [
      {
        id: "older-load",
        loadId: "older-load",
        status: "Not selected",
        serverAuthorized: true,
      },
    ],
  });
  const load = openLoad(poster.userId);
  load.id = "load-released-slot";
  load.claimRequests = [
    {
      id: "bid_released_slot",
      userId: bidder.userId,
      amount: 660,
      status: "pending",
      requestedAt: "2026-08-02T12:00:00.000Z",
    },
  ];
  await kv.put(LOAD_STORE_KEY, JSON.stringify([load]));
  const posterSession = await sessionFor(env, poster);
  await sessionFor(env, bidder);

  const accepted = await postAction(env, posterSession, {
    action: "accept",
    loadId: load.id,
    requestId: "bid_released_slot",
  });
  assert.equal(accepted.response.status, 200, JSON.stringify(accepted.body));
  const carrierRow = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(bidder.userId)
    .first();
  const pickups = JSON.parse(carrierRow.active_pickups);
  assert.equal(pickups.length, 2);
  assert.equal(pickups.filter((item) => item.status === "Confirmed").length, 1);
});

test("concurrent acceptance serializes one winning bid", async () => {
  const kv = new MemoryKv();
  const env = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: new SqliteD1(),
    CF_PAGES: "1",
  };
  const poster = shipper("usr_race_shipper");
  const carrierA = carrier("usr_race_carrier_a");
  const carrierB = carrier("usr_race_carrier_b");
  const load = openLoad(poster.userId);
  load.claimRequests = [
    {
      id: "bid_race_a",
      userId: carrierA.userId,
      amount: 600,
      status: "pending",
      requestedAt: "2026-08-02T12:00:00.000Z",
    },
    {
      id: "bid_race_b",
      userId: carrierB.userId,
      amount: 700,
      status: "pending",
      requestedAt: "2026-08-02T12:00:01.000Z",
    },
  ];
  await kv.put(LOAD_STORE_KEY, JSON.stringify([load]));
  const posterSession = await sessionFor(env, poster);
  await sessionFor(env, carrierA);
  await sessionFor(env, carrierB);
  const results = await Promise.all([
    postAction(env, posterSession, {
      action: "accept",
      loadId: load.id,
      requestId: "bid_race_a",
    }),
    postAction(env, posterSession, {
      action: "accept",
      loadId: load.id,
      requestId: "bid_race_b",
    }),
  ]);

  assert.deepEqual(
    results.map((result) => result.response.status).sort(),
    [200, 409],
  );
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY))[0];
  assert.equal(stored.status, "accepted");
  assert.equal(
    stored.claimRequests.filter((request) => request.status === "accepted").length,
    1,
  );
  assert.equal(
    stored.claimRequests.filter((request) => request.status === "not_selected").length,
    1,
  );
  const winner = stored.acceptedByUserId;
  const loser = winner === carrierA.userId ? carrierB.userId : carrierA.userId;
  const winnerAccount = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(winner)
    .first();
  const loserAccount = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(loser)
    .first();
  assert.equal(JSON.parse(winnerAccount.active_pickups)[0].status, "Confirmed");
  assert.equal(JSON.parse(loserAccount.active_pickups).length, 0);
});

test("one-truck carrier capacity serializes acceptance across different loads", async () => {
  const kv = new MemoryKv();
  const env = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: new SqliteD1(),
    CF_PAGES: "1",
  };
  const poster = shipper("usr_capacity_shipper");
  const bidder = carrier("usr_capacity_carrier");
  const firstLoad = openLoad(poster.userId);
  firstLoad.id = "load-capacity-a";
  firstLoad.claimRequests = [
    {
      id: "bid_capacity_a",
      userId: bidder.userId,
      amount: 610,
      status: "pending",
      requestedAt: "2026-08-02T12:00:00.000Z",
    },
  ];
  const secondLoad = {
    ...openLoad(poster.userId),
    id: "load-capacity-b",
    from: "Savannah, GA",
    to: "Jacksonville, FL",
    claimRequests: [
      {
        id: "bid_capacity_b",
        userId: bidder.userId,
        amount: 640,
        status: "pending",
        requestedAt: "2026-08-02T12:00:01.000Z",
      },
    ],
  };
  await kv.put(LOAD_STORE_KEY, JSON.stringify([firstLoad, secondLoad]));
  const posterSession = await sessionFor(env, poster);
  await sessionFor(env, bidder);

  const results = await Promise.all([
    postAction(env, posterSession, {
      action: "accept",
      loadId: firstLoad.id,
      requestId: "bid_capacity_a",
    }),
    postAction(env, posterSession, {
      action: "accept",
      loadId: secondLoad.id,
      requestId: "bid_capacity_b",
    }),
  ]);

  assert.deepEqual(
    results.map((result) => result.response.status).sort(),
    [200, 409],
  );
  assert.equal(
    results.find((result) => result.response.status === 409).body.reason,
    "plan_concurrency_limit",
  );
  const acceptedRows = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT load_id FROM loads WHERE status = 'accepted'",
  ).all();
  assert.equal(acceptedRows.results.length, 1);
  const carrierRow = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(bidder.userId)
    .first();
  assert.equal(JSON.parse(carrierRow.active_pickups).length, 1);
});

test("a failed KV mirror remains accepted in D1 and repairs on retry", async () => {
  const kv = new MemoryKv();
  const env = {
    RELOCATION_MANAGER_LEADS: kv,
    RELOCATION_MANAGER_DB: new SqliteD1(),
    CF_PAGES: "1",
  };
  const poster = shipper("usr_repair_shipper");
  const bidder = carrier("usr_repair_carrier");
  const load = openLoad(poster.userId);
  load.id = "load-repair-test";
  load.claimRequests = [
    {
      id: "bid_repair",
      userId: bidder.userId,
      amount: 655,
      status: "pending",
      requestedAt: "2026-08-02T12:00:00.000Z",
    },
  ];
  await kv.put(LOAD_STORE_KEY, JSON.stringify([load]));
  const posterSession = await sessionFor(env, poster);
  await sessionFor(env, bidder);
  kv.failLoadPuts = 1;

  const accepted = await postAction(env, posterSession, {
    action: "accept",
    loadId: load.id,
    requestId: "bid_repair",
  });
  assert.equal(accepted.response.status, 200, JSON.stringify(accepted.body));
  assert.equal(JSON.parse(await kv.get(LOAD_STORE_KEY))[0].status, "open");

  const retried = await postAction(env, posterSession, {
    action: "accept",
    loadId: load.id,
    requestId: "bid_repair",
  });
  assert.equal(retried.response.status, 200, JSON.stringify(retried.body));
  assert.match(retried.body.message, /already accepted/i);
  const repaired = JSON.parse(await kv.get(LOAD_STORE_KEY))[0];
  assert.equal(repaired.status, "accepted");
  assert.equal(repaired.acceptedRequestId, "bid_repair");
  const carrierRow = await env.RELOCATION_MANAGER_DB.prepare(
    "SELECT active_pickups FROM accounts WHERE user_id = ?",
  )
    .bind(bidder.userId)
    .first();
  assert.equal(JSON.parse(carrierRow.active_pickups).length, 1);
});

test("Pages fails closed when the durable acceptance lock is unavailable", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv, CF_PAGES: "1" };
  const poster = shipper("usr_lockless_shipper");
  const bidder = carrier("usr_lockless_carrier");
  const load = openLoad(poster.userId);
  load.claimRequests = [
    {
      id: "bid_lockless",
      userId: bidder.userId,
      amount: 650,
      status: "pending",
      requestedAt: "2026-08-02T12:00:00.000Z",
    },
  ];
  await kv.put(LOAD_STORE_KEY, JSON.stringify([load]));
  const posterSession = await sessionFor(env, poster);
  await sessionFor(env, bidder);
  const result = await postAction(env, posterSession, {
    action: "accept",
    loadId: load.id,
    requestId: "bid_lockless",
  });
  assert.equal(result.response.status, 503);
  assert.equal(result.body.reason, "acceptance_transaction_unavailable");
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY))[0];
  assert.equal(stored.status, "open");
});

test("the production member bundle exposes photos and real bid controls", async () => {
  const [member, app, styles] = await Promise.all([
    readFile(new URL("../dist/member.html", import.meta.url), "utf8"),
    readFile(new URL("../dist/app.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(member, /id="postPhotos"/);
  assert.match(member, /image\/jpeg,image\/png,image\/webp/);
  assert.match(app, /action: "bid"/);
  assert.match(app, /Bid on load/);
  assert.match(app, /action: "decline"/);
  assert.match(app, /photos: postPhotoPayload/);
  assert.match(app, /relatedButtons/);
  assert.match(styles, /\.load-bid-form/);
  assert.match(styles, /\.load-photo-gallery/);
});
