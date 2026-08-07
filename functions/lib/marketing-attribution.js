import { cleanString } from "../api/_auth.js";

const ATTRIBUTION_FIELDS = Object.freeze([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "ad_campaign_id",
  "ad_set_id",
  "ad_id",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
]);

const CLICK_FIELDS = new Set(["fbclid", "gclid", "gbraid", "wbraid", "ttclid"]);
const WHOP_COMPANY_ID = "biz_xfgfRxrQ5hdHTS";
const WHOP_CONVERSIONS_URL = "https://api.whop.com/api/v1/conversions";

export function normalizeMarketingAttribution(input = {}) {
  if (!input || typeof input !== "object" || input.consent !== true) return {};

  const normalized = { consent: true };
  for (const field of ATTRIBUTION_FIELDS) {
    const value = cleanString(input[field], CLICK_FIELDS.has(field) ? 300 : 160);
    if (value) normalized[field] = value;
  }

  const anonymousId = cleanString(input.anonymous_id, 160);
  if (/^wuid_[A-Za-z0-9_-]+$/.test(anonymousId)) normalized.anonymous_id = anonymousId;

  const capturedAt = cleanString(input.captured_at, 80);
  if (capturedAt && !Number.isNaN(Date.parse(capturedAt))) normalized.captured_at = capturedAt;

  const landingUrl = safeAttributionUrl(input.landing_url, true);
  if (landingUrl) normalized.landing_url = landingUrl;

  const referrerUrl = safeAttributionUrl(input.referrer_url, false);
  if (referrerUrl) normalized.referrer_url = referrerUrl;

  return normalized;
}

export function isInitialPaidShipperEvent(eventType, object = {}, account = {}) {
  const successfulCheckout = eventType === "checkout.session.async_payment_succeeded"
    || (eventType === "checkout.session.completed" && object.payment_status === "paid");
  return successfulCheckout && account.paymentStatus === "paid_shipper";
}

export async function sendWhopPaidShipperConversion(env = {}, input = {}, fetchImpl = fetch) {
  const apiKey = cleanString(env.WHOP_API_KEY, 512);
  const attribution = normalizeMarketingAttribution(input.attribution);
  if (!apiKey) return { sent: false, reason: "not-configured" };
  if (attribution.consent !== true) return { sent: false, reason: "no-consent" };

  const eventId = cleanString(input.eventId, 160);
  const userId = cleanString(input.userId, 80);
  const email = cleanString(input.email, 180).toLowerCase();
  const amountCents = Number(input.amountCents);
  const context = pickContext(attribution);
  const payload = {
    company_id: WHOP_COMPANY_ID,
    event_name: "custom",
    custom_name: "paid_shipper",
    action_source: "website",
    event_id: eventId || undefined,
    event_time: safeEventTime(input.eventTime),
    currency: "usd",
    value: Number.isFinite(amountCents) && amountCents >= 0 ? amountCents / 100 : undefined,
    url: "https://relocationmanagerusa.com/checkout-success",
    referrer_url: attribution.referrer_url || attribution.landing_url || undefined,
    user: compactObject({
      anonymous_id: attribution.anonymous_id,
      external_id: userId,
      email,
    }),
    context: compactObject(context),
  };

  const response = await fetchImpl(WHOP_CONVERSIONS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(eventId ? { "idempotency-key": `stripe-${eventId}`.slice(0, 255) } : {}),
    },
    body: JSON.stringify(compactObject(payload)),
  });

  if (!response.ok) {
    throw new Error(`Whop conversion request failed with ${response.status}.`);
  }
  const data = await response.json().catch(() => ({}));
  return { sent: true, id: cleanString(data?.id, 160) };
}

function pickContext(attribution) {
  const context = {};
  for (const field of ATTRIBUTION_FIELDS) {
    if (attribution[field]) context[field] = attribution[field];
  }
  return context;
}

function safeAttributionUrl(value, keepAttributionQuery) {
  const raw = cleanString(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    if (url.protocol !== "https:") return "";
    const safeQuery = new URLSearchParams();
    if (keepAttributionQuery) {
      for (const field of ATTRIBUTION_FIELDS) {
        const fieldValue = cleanString(url.searchParams.get(field), CLICK_FIELDS.has(field) ? 300 : 160);
        if (fieldValue) safeQuery.set(field, fieldValue);
      }
    }
    url.search = safeQuery.toString();
    url.hash = "";
    return cleanString(url.toString(), 500);
  } catch {
    return "";
  }
}

function safeEventTime(value) {
  const raw = cleanString(value, 80);
  if (!raw || Number.isNaN(Date.parse(raw))) return undefined;
  return new Date(raw).toISOString();
}

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => {
    if (value === undefined || value === null || value === "") return false;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    return true;
  }));
}
