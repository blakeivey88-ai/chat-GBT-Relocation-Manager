import {
  cleanString,
  emailVerified,
  ensureAccountShape,
  isEntitled,
  isProfileComplete,
  requireSessionAccount,
  upsertAccount,
  validateCsrfToken,
} from "./_auth.js";
import { recordAuditEvent } from "../lib/audit.js";
import { stripeSecretKey } from "../lib/stripe-config.js";

const PLAN_LINKS = Object.freeze({
  shipper: "https://buy.stripe.com/fZu4gA5B06AH6UWepqaVa00",
  driver: "https://buy.stripe.com/28EdRa9RgcZ53IKbdeaVa01",
  "fleet-starter": "https://buy.stripe.com/3cI4gA8Nc6AH6UW6WYaVa02",
  "fleet-growth": "https://buy.stripe.com/00w00kfbAcZ52EG5SUaVa04",
  "fleet-pro": "https://buy.stripe.com/3cIcN69RgaQXbbcftuaVa03",
  "dispatcher-broker": "https://buy.stripe.com/fZu28s1kK0cj5QSgxyaVa05",
});

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    if (!sameOrigin(request) || !validateCsrfToken(request, body)) {
      return json({ ok: false, error: "Session expired. Refresh and try again." }, 403);
    }

    const access = await requireSessionAccount(request, env);
    if (!access.ok) return json({ ok: false, error: access.error }, access.status || 401);

    const account = ensureAccountShape(access.account);
    if (!emailVerified(account)) {
      return json({ ok: false, error: "Verify your email before checkout." }, 403);
    }
    if (!isProfileComplete(account)) {
      return json({ ok: false, error: "Complete your profile before checkout." }, 403);
    }
    if (isEntitled(account)) {
      return json({ ok: true, alreadyActive: true, redirect: "/member.html#workbench" });
    }

    const plan = cleanString(body.plan || account.checkoutPlan || "", 80);
    const paymentLinkUrl = PLAN_LINKS[plan];
    if (!paymentLinkUrl) return json({ ok: false, error: "Choose a valid plan." }, 400);

    const secret = stripeSecretKey(env);
    if (!secret) return json({ ok: false, error: "Secure checkout is unavailable." }, 500);

    const priceId = await resolvePriceId(secret, paymentLinkUrl, plan);
    if (!priceId) return json({ ok: false, error: "That plan is not available for checkout." }, 502);

    await upsertAccount(env, { ...account, checkoutPlan: plan });

    const origin = new URL(request.url).origin;
    const form = new URLSearchParams({
      mode: "subscription",
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled&plan=${encodeURIComponent(plan)}`,
      client_reference_id: account.userId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "metadata[user_id]": account.userId,
      "metadata[plan]": plan,
      "subscription_data[metadata][user_id]": account.userId,
      "subscription_data[metadata][plan]": plan,
    });
    if (account.stripeCustomerId) form.set("customer", account.stripeCustomerId);
    else form.set("customer_email", account.email);

    const response = await stripeRequest(secret, "/v1/checkout/sessions", {
      method: "POST",
      body: form,
    });
    if (!response.ok || !response.data?.url) {
      return json({ ok: false, error: "Stripe could not start checkout. Please try again." }, 502);
    }

    await recordAuditEvent(env, {
      actionType: "checkout.session.created",
      actorUserId: account.userId,
      actorRole: account.role,
      targetType: "subscription_checkout",
      targetId: cleanString(response.data.id || "", 120),
      after: { plan, status: "created" },
      meta: { source: "api/checkout" },
    }).catch(() => {});

    return json({ ok: true, url: response.data.url });
  } catch {
    return json({ ok: false, error: "Secure checkout could not start. Please try again." }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function resolvePriceId(secret, paymentLinkUrl, plan) {
  const links = await stripeRequest(secret, "/v1/payment_links?active=true&limit=100");
  if (!links.ok) return "";
  const paymentLink = (links.data?.data || []).find((item) =>
    item?.url === paymentLinkUrl || cleanString(item?.metadata?.plan || "", 80) === plan,
  );
  if (!paymentLink?.id) return "";
  const lineItems = await stripeRequest(
    secret,
    `/v1/payment_links/${encodeURIComponent(paymentLink.id)}/line_items?limit=1`,
  );
  return cleanString(lineItems.data?.data?.[0]?.price?.id || "", 160);
}

async function stripeRequest(secret, path, options = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(options.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, data };
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "https://relocationmanagerusa.com",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-csrf-token",
  };
}
