import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { upsertAccount } from "../functions/api/_auth.js";
import { onRequestPost as stripeWebhook } from "../functions/api/stripe-webhook.js";
import {
  isInitialPaidShipperEvent,
  normalizeMarketingAttribution,
  sendWhopPaidShipperConversion,
} from "../functions/lib/marketing-attribution.js";

class MemoryKv {
  constructor() {
    this.values = new Map();
  }
  async get(key) { return this.values.get(key) ?? null; }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = "" } = {}) {
    return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })), cursor: "", list_complete: true };
  }
}

test("marketing attribution requires consent and keeps only bounded safe fields", () => {
  assert.deepEqual(normalizeMarketingAttribution({ utm_campaign: "ignored" }), {});

  const normalized = normalizeMarketingAttribution({
    consent: true,
    utm_source: "whop",
    utm_campaign: "shipper-video",
    utm_content: "that-was-easy-v1",
    fbclid: "abc123",
    anonymous_id: "wuid_visitor_123",
    landing_url: "https://relocationmanagerusa.com/signup?utm_source=whop&email=private@example.com&token=secret#verify",
    referrer_url: "javascript:alert(1)",
    password: "must-not-survive",
  });

  assert.equal(normalized.consent, true);
  assert.equal(normalized.utm_campaign, "shipper-video");
  assert.equal(normalized.utm_content, "that-was-easy-v1");
  assert.equal(normalized.anonymous_id, "wuid_visitor_123");
  assert.equal(normalized.landing_url, "https://relocationmanagerusa.com/signup?utm_source=whop");
  assert.doesNotMatch(normalized.landing_url, /private|token|secret/);
  assert.equal(normalized.referrer_url, undefined);
  assert.equal(normalized.password, undefined);
});

test("only an initial successful shipper checkout qualifies as a paid shipper", () => {
  const shipper = { paymentStatus: "paid_shipper" };
  assert.equal(isInitialPaidShipperEvent("checkout.session.completed", { payment_status: "paid" }, shipper), true);
  assert.equal(isInitialPaidShipperEvent("checkout.session.async_payment_succeeded", {}, shipper), true);
  assert.equal(isInitialPaidShipperEvent("checkout.session.completed", { payment_status: "unpaid" }, shipper), false);
  assert.equal(isInitialPaidShipperEvent("invoice.paid", {}, shipper), false);
  assert.equal(isInitialPaidShipperEvent("checkout.session.completed", { payment_status: "paid" }, { paymentStatus: "paid_driver" }), false);
});

test("Whop conversion is custom paid_shipper, idempotent, and carries verified source fields", async () => {
  const calls = [];
  const result = await sendWhopPaidShipperConversion({ WHOP_API_KEY: "test-secret" }, {
    attribution: {
      consent: true,
      utm_source: "whop",
      utm_campaign: "shipper-video",
      utm_content: "that-was-easy-v1",
      ad_campaign_id: "adcamp_123",
      ad_id: "ad_456",
      anonymous_id: "wuid_visitor_123",
    },
    eventId: "evt_checkout_paid_123",
    eventTime: "2026-08-07T12:00:00Z",
    userId: "usr_shipper_123",
    email: "shipper@example.com",
    amountCents: 999,
  }, async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "conv_123" }), { status: 200, headers: { "content-type": "application/json" } });
  });

  assert.deepEqual(result, { sent: true, id: "conv_123" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.whop.com/api/v1/conversions");
  assert.equal(calls[0].init.headers.authorization, "Bearer test-secret");
  assert.equal(calls[0].init.headers["idempotency-key"], "stripe-evt_checkout_paid_123");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.company_id, "biz_xfgfRxrQ5hdHTS");
  assert.equal(body.event_name, "custom");
  assert.equal(body.custom_name, "paid_shipper");
  assert.equal(body.value, 9.99);
  assert.equal(body.context.utm_campaign, "shipper-video");
  assert.equal(body.context.utm_content, "that-was-easy-v1");
  assert.equal(body.user.anonymous_id, "wuid_visitor_123");
});

test("Whop conversion never sends without both server key and visitor consent", async () => {
  let calls = 0;
  const fakeFetch = async () => { calls += 1; return new Response("{}"); };
  assert.deepEqual(await sendWhopPaidShipperConversion({}, { attribution: { consent: true } }, fakeFetch), { sent: false, reason: "not-configured" });
  assert.deepEqual(await sendWhopPaidShipperConversion({ WHOP_API_KEY: "key" }, { attribution: {} }, fakeFetch), { sent: false, reason: "no-consent" });
  assert.equal(calls, 0);
});

test("invalid Stripe signatures cannot produce a Whop conversion", async () => {
  const originalFetch = globalThis.fetch;
  let whopCalls = 0;
  globalThis.fetch = async () => { whopCalls += 1; return new Response("{}", { status: 200 }); };
  try {
    const response = await stripeWebhook({
      request: new Request("https://relocationmanagerusa.com/api/stripe-webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=invalid" },
        body: JSON.stringify({ type: "checkout.session.completed" }),
      }),
      env: { STRIPE_WEBHOOK_SECRET: "stripe-secret", WHOP_API_KEY: "whop-secret", RELOCATION_MANAGER_LEADS: new MemoryKv() },
    });
    assert.equal(response.status, 400);
    assert.equal(whopCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a signed paid shipper checkout queues exactly one Whop conversion", async () => {
  const kv = new MemoryKv();
  const userId = "usr_paid_shipper_attribution";
  await upsertAccount({ RELOCATION_MANAGER_LEADS: kv }, {
    userId,
    email: "paid-shipper@example.com",
    name: "Paid Shipper",
    company: "Paid Shipper LLC",
    type: "Customer / shipper (post loads, no claiming) - $9.99/mo",
    role: "Customer / Shipper",
    checkoutPlan: "shipper",
    paymentStatus: "unpaid_waitlist",
    subscriptionStatus: "unpaid",
    marketingAttribution: {
      consent: true,
      utm_source: "whop",
      utm_campaign: "shipper-video",
      utm_content: "that-was-easy-v1",
      anonymous_id: "wuid_paid_shipper",
    },
  });

  const event = {
    id: "evt_paid_shipper_001",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    data: { object: {
      id: "cs_paid_shipper_001",
      client_reference_id: userId,
      customer: "cus_paid_shipper_001",
      subscription: "sub_paid_shipper_001",
      customer_details: { email: "paid-shipper@example.com", name: "Paid Shipper" },
      amount_total: 999,
      payment_status: "paid",
      metadata: { user_id: userId, plan: "shipper" },
    } },
  };
  const payload = JSON.stringify(event);
  const secret = "stripe-test-secret";
  const signature = await stripeSignature(payload, secret);
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: "conv_paid_shipper_001" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const pending = [];
  try {
    const response = await stripeWebhook({
      request: new Request("https://relocationmanagerusa.com/api/stripe-webhook", {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: payload,
      }),
      env: { STRIPE_WEBHOOK_SECRET: secret, WHOP_API_KEY: "whop-test-secret", RELOCATION_MANAGER_LEADS: kv },
      waitUntil(promise) { pending.push(promise); },
    });
    assert.equal(response.status, 200);
    await Promise.all(pending);
    const whopCalls = calls.filter((call) => call.url === "https://api.whop.com/api/v1/conversions");
    assert.equal(whopCalls.length, 1);
    const body = JSON.parse(whopCalls[0].init.body);
    assert.equal(body.custom_name, "paid_shipper");
    assert.equal(body.value, 9.99);
    assert.equal(body.context.utm_content, "that-was-easy-v1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("browser tracking stays consent-gated and checkout success loads the pixel funnel", async () => {
  const loader = await readFile(new URL("../dist/analytics-loader.js", import.meta.url), "utf8");
  const success = await readFile(new URL("../dist/checkout-success.html", import.meta.url), "utf8");
  const signup = await readFile(new URL("../dist/signup.html", import.meta.url), "utf8");
  const middleware = await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8");

  assert.match(loader, /readConsent\(\) !== 'granted'/);
  assert.match(loader, /https:\/\/t\.whop\.tw/);
  assert.match(loader, /whop\.track\('page'\)/);
  assert.match(loader, /localStorage\.getItem\('_wuid'\)/);
  assert.match(signup, /marketingAttribution: window\.rmMarketingAttribution/);
  assert.match(success, /src="\/analytics-loader\.js"/);
  assert.match(middleware, /https:\/\/t\.whop\.tw/);
});

async function stripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const digest = [...new Uint8Array(signed)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${digest}`;
}
