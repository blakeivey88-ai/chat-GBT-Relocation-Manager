import test from "node:test";
import assert from "node:assert/strict";

import { onRequestPost as accountPost } from "../functions/api/account.js";
import { createSession, userIdKey } from "../functions/api/_auth.js";

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
  async list({ prefix = "" } = {}) {
    return {
      keys: [...this.values.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((name) => ({ name })),
      cursor: "",
      list_complete: true,
    };
  }
}

// Server-written trust evidence that a member profile save must never touch.
const SERVER_TRANSACTIONS = [{ id: "txn-server-1", amount: 500, verified: true }];
const SERVER_PICKUPS = [{ id: "pickup-server-1", status: "in_progress" }];

function entitledAccount(overrides = {}) {
  return {
    userId: "usr_anti_tamper",
    email: "anti-tamper@example.invalid",
    emailVerifiedAt: "2026-07-29T12:00:00.000Z",
    profileComplete: true,
    name: "Original Name",
    company: "Original Co",
    type: "Independent driver / self-insured - $29.99/mo",
    paymentStatus: "paid_driver",
    subscriptionStatus: "active",
    loadAccess: "claim",
    subscriptionAccess: "claim",
    carrierVerifiedAt: "2026-07-29T12:00:00.000Z",
    verifiedTransactions: SERVER_TRANSACTIONS.map((entry) => ({ ...entry })),
    activePickups: SERVER_PICKUPS.map((entry) => ({ ...entry })),
    ...overrides,
  };
}

async function saveProfile(account, body) {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  await kv.put(userIdKey(account.userId), JSON.stringify(account));
  const session = await createSession(env, account.userId);
  const csrf = "anti-tamper-csrf";
  const response = await accountPost({
    request: new Request("https://relocationmanagerusa.com/api/account", {
      method: "POST",
      headers: {
        origin: "https://relocationmanagerusa.com",
        cookie: `rm_session=${session}; rm_csrf=${csrf}`,
        "content-type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify(body),
    }),
    env,
  });
  const payload = await response.json();
  const stored = JSON.parse(await kv.get(userIdKey(account.userId)));
  return { response, payload, stored };
}

test("a member profile save cannot set or overwrite verifiedTransactions or activePickups", async () => {
  const { response, payload, stored } = await saveProfile(entitledAccount(), {
    action: "save",
    name: "Updated Name", // a legitimate edit, submitted alongside the tampering
    verifiedTransactions: [{ id: "FAKE-TXN", amount: 999999, verified: true }],
    activePickups: [{ id: "FAKE-PICKUP", status: "delivered" }],
  });

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.ok, true);

  // Server-written evidence is preserved exactly; the forged entries never persist.
  assert.equal(stored.verifiedTransactions.length, 1);
  assert.equal(stored.verifiedTransactions[0].id, "txn-server-1");
  assert.equal(stored.activePickups.length, 1);
  assert.equal(stored.activePickups[0].id, "pickup-server-1");
  assert.ok(!JSON.stringify(stored).includes("FAKE-TXN"));
  assert.ok(!JSON.stringify(stored).includes("FAKE-PICKUP"));
  assert.ok(!JSON.stringify(stored).includes("999999"));

  // The legitimate edit in the same request still takes effect.
  assert.equal(stored.name, "Updated Name");
});

test("a member profile save cannot inject verifiedTransactions when the account had none", async () => {
  const clean = entitledAccount({ verifiedTransactions: [], activePickups: [] });
  const { stored } = await saveProfile(clean, {
    action: "save",
    note: "hello",
    verifiedTransactions: [{ id: "FAKE-TXN", amount: 1 }],
    activePickups: [{ id: "FAKE-PICKUP" }],
  });
  assert.deepEqual(stored.verifiedTransactions, []);
  assert.deepEqual(stored.activePickups, []);
});

test("ordinary allowed profile fields still update, leaving server evidence intact", async () => {
  const { response, payload, stored } = await saveProfile(entitledAccount(), {
    action: "save",
    name: "Legit New Name",
    company: "Legit New Co",
    note: "Updated note",
  });

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.ok, true);
  assert.equal(stored.name, "Legit New Name");
  assert.equal(stored.company, "Legit New Co");
  assert.equal(stored.note, "Updated note");

  // Untouched by an ordinary save.
  assert.equal(stored.verifiedTransactions[0].id, "txn-server-1");
  assert.equal(stored.activePickups[0].id, "pickup-server-1");
});

test("an authenticated profile edit can update company and account type without a second password", async () => {
  const { response, payload, stored } = await saveProfile(entitledAccount(), {
    action: "complete-profile",
    profileView: "broker",
    profile: {
      name: "Original Name",
      company: "Updated Company LLC",
      type: "Dispatcher / broker - $189.99/mo",
      email: "anti-tamper@example.invalid",
    },
  });

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.memberAccess.authenticated, true);
  assert.equal(stored.company, "Updated Company LLC");
  assert.equal(stored.type, "Dispatcher / broker - $189.99/mo");
  assert.equal(stored.profileView, "broker");
  assert.equal(stored.paymentStatus, "paid_driver");
  assert.equal(stored.subscriptionAccess, "claim");
});

// --- E1c: trustAudit is server-controlled; trustDisputes stays member-writable ---

const SERVER_TRUST_AUDIT = [
  { id: "audit-server-1", before: 60, after: 62, delta: 2, reason: "verified load completed" },
];

test("a member profile save cannot forge trustAudit score-adjustment entries", async () => {
  const account = entitledAccount({ trustAudit: SERVER_TRUST_AUDIT.map((e) => ({ ...e })) });
  const { response, payload, stored } = await saveProfile(account, {
    action: "save",
    name: "Updated Name",
    trustAudit: [
      { id: "FAKE-AUDIT", before: 10, after: 100, delta: 90, reason: "self-promotion", fraudSignals: [] },
    ],
  });

  assert.equal(response.status, 200, JSON.stringify(payload));
  // Server-written trust history preserved; the forged score jump never persists,
  // so syncTrustAudit can never emit a trust.score_adjustment from member input.
  assert.equal(stored.trustAudit.length, 1);
  assert.equal(stored.trustAudit[0].id, "audit-server-1");
  assert.ok(!JSON.stringify(stored).includes("FAKE-AUDIT"));
  assert.ok(!JSON.stringify(stored).includes("self-promotion"));
  assert.ok(!JSON.stringify(stored.trustAudit).includes("100"));
  assert.equal(stored.name, "Updated Name"); // legitimate edit still applies
});

test("a member profile save cannot inject trustAudit when the account had none", async () => {
  const { stored } = await saveProfile(entitledAccount({ trustAudit: [] }), {
    action: "save",
    trustAudit: [{ id: "FAKE-AUDIT", before: 0, after: 999, delta: 999 }],
  });
  assert.deepEqual(stored.trustAudit, []);
});

test("locking trustAudit does not disable the live dispute form: trustDisputes and customerRatings still persist from a member save", async () => {
  const { response, payload, stored } = await saveProfile(
    entitledAccount({ trustDisputes: [], customerRatings: [] }),
    {
      action: "save",
      trustDisputes: [
        { id: "member-dispute-1", reviewId: "rev-9", loadId: "load-9", reason: "review was inaccurate", status: "open" },
      ],
      customerRatings: [{ id: "rating-1", score: 5 }],
    },
  );

  assert.equal(response.status, 200, JSON.stringify(payload));
  // Member-filed dispute round-trips (dispute form / scheduleAccountSync path intact).
  assert.equal(stored.trustDisputes.length, 1);
  assert.equal(stored.trustDisputes[0].id, "member-dispute-1");
  assert.equal(stored.trustDisputes[0].reason, "review was inaccurate");
  // customerRatings left unchanged by this unit and still writable.
  assert.equal(stored.customerRatings.length, 1);
  assert.equal(stored.customerRatings[0].id, "rating-1");
});
