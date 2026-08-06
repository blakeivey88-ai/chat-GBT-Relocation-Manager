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

const FULL_DETAILS = {
  commodity: "Palletized freight",
  dimensions: "8 ft x 4 ft x 5 ft",
  loadingHelp: "Driver assist requested",
  siteConditions: "Ground level, dock available",
  contactName: "Site Contact",
  contactPhone: "555-555-0100",
};

async function seedEnv(accounts) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  for (const acct of accounts) {
    await kv.put(userIdKey(acct.userId), JSON.stringify(acct));
  }
  await kv.put(LOAD_STORE_KEY, JSON.stringify([]));
  return { kv, env };
}

async function postLoad(env, acct, extra = {}) {
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
        from: "Atlanta, GA",
        to: "Nashville, TN",
        pickupDate: "2099-08-15",
        pickupTime: "09:00",
        equipment: "26 ft box truck",
        weight: "2,000 lbs",
        rate: 750,
        miles: 250,
        ...FULL_DETAILS,
        ...extra,
      }),
    }),
    env,
  });
  const body = await response.json();
  return { response, body, session };
}

test("posts missing carrier-decision details are rejected with a clear error", async () => {
  const poster = account("usr_incomplete");
  const { env } = await seedEnv([poster]);
  for (const missing of [
    "commodity",
    "dimensions",
    "loadingHelp",
    "siteConditions",
    "contactName",
    "contactPhone",
  ]) {
    const { response, body } = await postLoad(env, poster, { [missing]: "" });
    assert.equal(response.status, 400, `expected 400 when ${missing} missing`);
    assert.match(body.error, /full picture/i);
  }
});

test("a complete post stores every carrier-decision detail", async () => {
  const poster = account("usr_complete");
  const { env } = await seedEnv([poster]);
  const { response, body } = await postLoad(env, poster);
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.load.commodity, FULL_DETAILS.commodity);
  assert.equal(body.load.dimensions, FULL_DETAILS.dimensions);
  assert.equal(body.load.loadingHelp, FULL_DETAILS.loadingHelp);
  assert.equal(body.load.siteConditions, FULL_DETAILS.siteConditions);
  assert.equal(body.load.contactName, FULL_DETAILS.contactName);
  assert.equal(body.load.contactPhone, FULL_DETAILS.contactPhone);
});

test("same lane, same day, same poster is rejected as a duplicate", async () => {
  const poster = account("usr_dupe");
  const { env } = await seedEnv([poster]);
  const first = await postLoad(env, poster);
  assert.equal(first.response.status, 201);
  const second = await postLoad(env, poster);
  assert.equal(second.response.status, 409, JSON.stringify(second.body));
  assert.match(second.body.error, /already have an open post/i);
  assert.equal(second.body.duplicateLoadId, first.body.load.id);

  // A different pickup day on the same lane is allowed.
  const nextDay = await postLoad(env, poster, { pickupDate: "2099-08-16" });
  assert.equal(nextDay.response.status, 201, JSON.stringify(nextDay.body));
});

test("on-site contact phone is hidden from browsing carriers until accepted", async () => {
  const poster = account("usr_poster");
  const browser = account("usr_browser");
  const { env } = await seedEnv([poster, browser]);
  const posted = await postLoad(env, poster);
  assert.equal(posted.response.status, 201);

  const browserSession = await createSession(env, browser.userId);
  const listing = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${browserSession}`,
      },
    }),
    env,
  });
  const listingBody = await listing.json();
  assert.equal(listing.status, 200);
  const visible = listingBody.loads.find(
    (load) => load.id === posted.body.load.id,
  );
  assert.ok(visible, "load should be browsable");
  assert.equal(visible.contactName, FULL_DETAILS.contactName);
  assert.equal(visible.contactPhone, undefined);

  // The poster still sees their own contact phone in posted scope.
  const posterListing = await onRequestGet({
    request: new Request(
      "https://relocationmanagerusa.com/api/loads?scope=posted",
      {
        headers: {
          origin: "https://relocationmanagerusa.com",
          cookie: `rm_session=${posted.session}`,
        },
      },
    ),
    env,
  });
  const posterBody = await posterListing.json();
  assert.equal(posterListing.status, 200);
  assert.equal(posterBody.loads[0].contactPhone, FULL_DETAILS.contactPhone);
});

test("stale expired posts are dropped from storage on the next post", async () => {
  const poster = account("usr_stale");
  const { kv, env } = await seedEnv([poster]);
  const staleLoad = {
    id: "load-stale-test",
    from: "Old City, TX",
    to: "Older City, TX",
    rate: 500,
    pick: "Long ago",
    wt: "1,000 lbs",
    eq: "Cargo van",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-02T00:00:00.000Z",
    claimRequests: [],
  };
  await kv.put(LOAD_STORE_KEY, JSON.stringify([staleLoad]));
  const posted = await postLoad(env, poster);
  assert.equal(posted.response.status, 201);
  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, posted.body.load.id);
});

test("reports preserve evidence, hide reporter identity, and pull loads at three reports", async () => {
  const poster = account("usr_report_poster");
  const r1 = account("usr_reporter_1");
  const r2 = account("usr_reporter_2");
  const r3 = account("usr_reporter_3");
  const { kv, env } = await seedEnv([poster, r1, r2, r3]);
  const posted = await postLoad(env, poster);
  assert.equal(posted.response.status, 201);
  const loadId = posted.body.load.id;

  async function report(acct) {
    const session = await createSession(env, acct.userId);
    const csrf = `${acct.userId}-report-csrf`;
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
          action: "report",
          loadId,
          reason: "Suspected fraud",
          detail: "Rate is far above market and the poster refuses details.",
        }),
      }),
      env,
    });
    return { response, body: await response.json() };
  }

  const first = await report(r1);
  assert.equal(first.response.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.underReview, false);

  // Same reporter again does not double-count.
  const repeat = await report(r1);
  assert.equal(repeat.body.underReview, false);
  let stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored.find((l) => l.id === loadId).reportCount, 1);

  await report(r2);
  const third = await report(r3);
  assert.equal(third.body.underReview, true);

  stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  const flagged = stored.find((l) => l.id === loadId);
  assert.equal(flagged.status, "under_review");
  assert.equal(flagged.reports.length, 3);

  // Under-review loads leave the public board.
  const browserSession = await createSession(env, r1.userId);
  const listing = await onRequestGet({
    request: new Request("https://relocationmanagerusa.com/api/loads", {
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${browserSession}`,
      },
    }),
    env,
  });
  const listingBody = await listing.json();
  assert.equal(
    listingBody.loads.some((l) => l.id === loadId),
    false,
    "under-review load should be hidden",
  );

  // Reporter identities never appear in API responses.
  const posterSession = await createSession(env, poster.userId);
  const posterView = await onRequestGet({
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
  const posterBody = await posterView.json();
  const ownLoad = posterBody.loads.find((l) => l.id === loadId);
  assert.equal(ownLoad.reports, undefined);
  assert.equal(ownLoad.reportCount, 3);
});
