import test from "node:test";
import assert from "node:assert/strict";

import { onRequest as middleware } from "../functions/_middleware.js";
import { createSession, upsertAccount } from "../functions/api/_auth.js";
import { onRequestGet as getLoads } from "../functions/api/loads.js";

function request(pathname, init = {}) {
  return new Request(`https://relocationmanagerusa.com${pathname}`, init);
}

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

function publicContext(pathname) {
  let nextCalls = 0;
  return {
    context: {
      request: request(pathname),
      env: {},
      next() {
        nextCalls += 1;
        return new Response("public content", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
    nextCalls: () => nextCalls,
  };
}

for (const pathname of [
  "/support.html",
  "/resources.html",
  "/blog",
  "/states/california.html",
  "/cities/los-angeles.html",
  "/directories/truck-repair.html",
  "/blog/freight-fraud-prevention-guide.html",
  "/knowledge/cargo-insurance-guide.html",
]) {
  test(`allows anonymous public content: ${pathname}`, async () => {
    const probe = publicContext(pathname);
    const response = await middleware(probe.context);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "public content");
    assert.equal(probe.nextCalls(), 1);
  });
}

test("returns a JSON 404 for an unknown API without invoking static fallback", async () => {
  let nextCalls = 0;
  const response = await middleware({
    request: request("/api/definitely-not-real"),
    env: {},
    next() {
      nextCalls += 1;
      return new Response("<html>homepage fallback</html>");
    },
  });

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "API route not found.",
  });
  assert.equal(nextCalls, 0);
});

test("adds production security headers to public responses", async () => {
  const probe = publicContext("/");
  const response = await middleware(probe.context);

  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("strict-transport-security") || "", /max-age=31536000/);
  assert.match(response.headers.get("permissions-policy") || "", /camera=\(\)/);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
});

test("marks the private member workspace noindex and no-store", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const userId = "usr_private_member_headers";
  await upsertAccount(env, {
    userId,
    email: "private-member@example.com",
    name: "Private Member",
    company: "Private Member LLC",
    type: "Customer / shipper (post loads, no claiming) - $9.99/mo",
    role: "Customer / Shipper",
    emailVerifiedAt: new Date().toISOString(),
    paymentStatus: "paid_shipper",
    subscriptionStatus: "active",
    checkoutPlan: "shipper",
    profileComplete: true,
  });
  const session = await createSession(env, userId, { email: "private-member@example.com" });

  const response = await middleware({
    request: request("/member", { headers: { cookie: `rm_session=${session}` } }),
    env,
    next() {
      return new Response("member workspace", { headers: { "content-type": "text/html" } });
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("delegates a known protected API and preserves its anonymous 401", async () => {
  const apiRequest = request("/api/loads");
  const response = await middleware({
    request: apiRequest,
    env: {},
    next() {
      return getLoads({ request: apiRequest, env: {} });
    },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, { ok: false, error: "Not signed in." });
  assert.equal("loads" in body, false);
  assert.equal("profile" in body, false);
});

test("continues redirecting an anonymous private page to sign in", async () => {
  const response = await middleware({
    request: request("/account/billing"),
    env: {},
    next() {
      throw new Error("private page should not reach static content");
    },
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://relocationmanagerusa.com/signin?redirect=%2Faccount%2Fbilling",
  );
});

test("redirects a verified unpaid shipper to pricing without looping back to the member page", async () => {
  const kv = new MemoryKv();
  const env = { RELOCATION_MANAGER_LEADS: kv };
  const userId = "usr_unpaid_shipper_redirect";
  await upsertAccount(env, {
    userId,
    email: "unpaid-shipper@example.com",
    name: "Unpaid Shipper",
    company: "Test Shipper",
    type: "Customer / shipper (post loads, no claiming) - $9.99/mo",
    role: "Customer / Shipper",
    emailVerifiedAt: new Date().toISOString(),
    paymentStatus: "unpaid_waitlist",
    subscriptionStatus: "unpaid",
    checkoutPlan: "shipper",
  });
  const session = await createSession(env, userId, {
    email: "unpaid-shipper@example.com",
  });

  const response = await middleware({
    request: request("/member.html", {
      headers: { cookie: `rm_session=${session}` },
    }),
    env,
    next() {
      throw new Error("unpaid member page should not reach static content");
    },
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://relocationmanagerusa.com/pricing?redirect=%2Fmember.html",
  );
});
