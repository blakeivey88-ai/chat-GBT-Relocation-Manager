import {
  cleanString,
  dedupeTags,
  ensureAccountShape,
  extractStripeMetadata,
  linkStripeCustomer,
  linkStripeSubscription,
  loadAccessFromType,
  normalizeEmail,
  normalizePaidStatusFromPlan,
  normalizeSubscriptionStatus,
  paymentTags,
  readAccountByEmail,
  readAccountByUserId,
  resolveUserIdFromStripe,
  roleFromType,
  truckCountFromType,
  upsertAccount,
  workspaceFromType,
  boardKey,
  emailIndexKey,
  userIdKey,
} from './_auth.js';

import { recordAuditEvent } from '../lib/audit.js';

const PAYMENT_BY_AMOUNT = new Map([
  [999, { paymentStatus: 'paid_shipper', planLabel: 'Shippers Plan', type: 'Customer needing pickup - $9.99/mo' }],
  [2999, { paymentStatus: 'paid_driver', planLabel: 'Independent Driver', type: 'Independent driver / self-insured - $29.99/mo' }],
  [5999, { paymentStatus: 'paid_fleet_starter', planLabel: 'Fleet Starter', type: 'Broker 1–3 trucks - $59.99/mo' }],
  [7999, { paymentStatus: 'paid_fleet_growth', planLabel: 'Fleet Growth', type: 'Broker 4–7 trucks - $79.99/mo' }],
  [14999, { paymentStatus: 'paid_fleet_pro', planLabel: 'Fleet Pro', type: 'Broker 7–12 trucks - $149.99/mo' }],
]);

const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.funds_withdrawn',
  'charge.dispute.funds_reinstated',
  'charge.dispute.closed',
]);

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return json({ ok: false, error: 'Stripe webhook secret is not configured.' }, 500);
    }

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    if (!await verifyStripeSignature(payload, signature, secret)) {
      return json({ ok: false, error: 'Invalid signature.' }, 400);
    }

    const event = JSON.parse(payload);
    if (!HANDLED_EVENTS.has(event.type)) {
      return json({ ok: true, ignored: event.type });
    }

    const eventKey = stripeEventKey(event.id);
    if (await env.RELOCATION_MANAGER_LEADS.get(eventKey)) {
      return json({ ok: true, duplicate: true, eventId: event.id });
    }

    const object = event.data?.object || {};
    const paymentInfo = paymentInfoFromEvent(event.type, object);
    const metadata = extractStripeMetadata(object);
    const userId = await resolveUserIdFromStripe(env, object);

    const account = await resolveAccount(env, { userId, email: metadata.email, customerId: metadata.customerId, subscriptionId: metadata.subscriptionId });
    if (!account && !userId) {
      return json({ ok: true, ignored: 'unmatched-account' });
    }
    const now = new Date().toISOString();
    const eventCreatedAt = Number.isFinite(Number(event.created)) ? new Date(Number(event.created) * 1000).toISOString() : now;
    if (account?.stripeLastEventCreatedAt && eventCreatedAt < account.stripeLastEventCreatedAt) {
      return json({ ok: true, ignored: 'out-of-order', eventId: event.id, eventCreatedAt, lastEventCreatedAt: account.stripeLastEventCreatedAt });
    }
    const merged = ensureAccountShape({
      ...account,
      userId: account?.userId || metadata.userId || userId,
      email: account?.email || metadata.email,
      name: account?.name || object.customer_details?.name || metadata.email.split('@')[0] || 'Guest',
      company: account?.company || object.customer_details?.company || '',
      type: paymentInfo.type || account?.type || 'Independent driver / self-insured - $29.99/mo',
      role: account?.role || roleFromType(paymentInfo.type || account?.type),
      verification: paymentInfo.subscriptionStatus === 'active' || paymentInfo.subscriptionStatus === 'trialing' ? (account?.emailVerifiedAt ? 'Verified member' : 'Payment active') : (account?.verification || 'Not verified'),
      note: account?.note || 'Payment synced from Stripe checkout.',
      paymentStatus: paymentInfo.paymentStatus || normalizePaidStatusFromPlan(paymentInfo),
      subscriptionStatus: paymentInfo.subscriptionStatus || normalizeSubscriptionStatus(paymentInfo.paymentStatus),
      paidAt: paymentInfo.paidAt || account?.paidAt || now,
      planLabel: paymentInfo.planLabel || account?.planLabel || 'Paid plan',
      planName: paymentInfo.planName || account?.planName || paymentInfo.planLabel || 'Paid plan',
      stripeCustomerId: metadata.customerId || account?.stripeCustomerId || '',
      stripeSubscriptionId: metadata.subscriptionId || account?.stripeSubscriptionId || '',
      stripePriceId: paymentInfo.priceId || account?.stripePriceId || '',
      stripeSessionId: object.id || account?.stripeSessionId || '',
      stripeLastEventCreatedAt: eventCreatedAt,
      stripeLastEventId: event.id || account?.stripeLastEventId || '',
      stripeLastEventType: event.type || account?.stripeLastEventType || '',
      subscriptionCurrentPeriodEnd: paymentInfo.currentPeriodEnd || account?.subscriptionCurrentPeriodEnd || '',
      subscriptionCanceledAt: paymentInfo.canceledAt || account?.subscriptionCanceledAt || '',
      subscriptionCancelAtPeriodEnd: paymentInfo.cancelAtPeriodEnd ?? account?.subscriptionCancelAtPeriodEnd ?? false,
      subscriptionGraceUntil: paymentInfo.graceUntil || account?.subscriptionGraceUntil || '',
      subscriptionTrialAllowed: Boolean(paymentInfo.trialAllowed ?? account?.subscriptionTrialAllowed ?? false),
      subscriptionAccess: loadAccessFromType(paymentInfo.type || account?.type, paymentInfo.paymentStatus || account?.paymentStatus),
      loadAccess: loadAccessFromType(paymentInfo.type || account?.type, paymentInfo.paymentStatus || account?.paymentStatus),
      truckCount: account?.truckCount || truckCountFromType(paymentInfo.type || account?.type),
      tags: mergeTags(account?.tags, paymentTags(paymentInfo)),
      recentLoads: account?.recentLoads || [],
      recentRequests: account?.recentRequests || [],
      messages: account?.messages || [],
      plannedTrips: account?.plannedTrips || [],
      activePickups: account?.activePickups || [],
      laneAlerts: account?.laneAlerts || [],
      customerRatings: account?.customerRatings || [],
      checkoutPlan: account?.checkoutPlan || null,
      profileView: account?.profileView || workspaceFromType(paymentInfo.type || account?.type),
      createdAt: account?.createdAt || now,
      updatedAt: now,
    }, account || {});

    await upsertAccount(env, merged);
    if (merged.stripeCustomerId) {
      await linkStripeCustomer(env, merged.stripeCustomerId, merged.userId);
    }
    if (merged.stripeSubscriptionId) {
      await linkStripeSubscription(env, merged.stripeSubscriptionId, merged.userId);
    }

    await markLeadPaid(env, merged, object, paymentInfo);
    await recordAuditEvent(env, {
      actionType: `stripe.${event.type}`,
      actorUserId: merged.userId,
      actorRole: merged.role,
      targetType: 'account',
      targetId: merged.userId,
      before: { paymentStatus: account?.paymentStatus || '', subscriptionStatus: account?.subscriptionStatus || '' },
      after: { paymentStatus: merged.paymentStatus, subscriptionStatus: merged.subscriptionStatus, planLabel: merged.planLabel },
      meta: { eventId: event.id, customerId: merged.stripeCustomerId, subscriptionId: merged.stripeSubscriptionId },
      verifiedEventRef: event.id,
    });
    await env.RELOCATION_MANAGER_LEADS.put(eventKey, now);

    return json({
      ok: true,
      userId: merged.userId,
      email: merged.email,
      subscriptionStatus: merged.subscriptionStatus,
      paymentStatus: merged.paymentStatus,
      planLabel: merged.planLabel,
      stripeCustomerId: merged.stripeCustomerId,
      stripeSubscriptionId: merged.stripeSubscriptionId,
    });
  } catch (error) {
    return json({ ok: false, error: 'Stripe webhook handling failed.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function paymentInfoFromEvent(eventType, object) {
  if (eventType.startsWith('customer.subscription.')) {
    return subscriptionPaymentInfo(object, eventType);
  }
  if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    return invoicePaymentInfo(object, eventType);
  }
  if (eventType === 'charge.refunded') {
    return chargePaymentInfo(object, 'refunded');
  }
  if (eventType.startsWith('charge.dispute.')) {
    return chargePaymentInfo(object, 'disputed');
  }
  return sessionPaymentInfo(object, eventType);
}

function chargePaymentInfo(charge, status) {
  const planLabel = cleanString(charge.metadata?.plan_label || charge.metadata?.plan || charge.description || 'Paid plan', 80);
  const type = cleanString(charge.metadata?.profile_type || charge.metadata?.type || charge.description || 'Independent driver / self-insured - $29.99/mo', 120);
  const base = PAYMENT_BY_AMOUNT.get(Number(charge.amount || charge.amount_refunded || 0)) || { paymentStatus: status, planLabel, planName: planLabel, type };
  return {
    ...base,
    paymentStatus: status,
    subscriptionStatus: status === 'refunded' ? 'canceled' : 'paused',
    paidAt: new Date().toISOString(),
    currentPeriodEnd: '',
    canceledAt: status === 'refunded' ? new Date().toISOString() : '',
    cancelAtPeriodEnd: false,
    graceUntil: '',
  };
}

function sessionPaymentInfo(session, eventType) {
  const amount = Number(session.amount_total || session.amount_paid || session.total || 0);
  const byAmount = PAYMENT_BY_AMOUNT.get(amount);
  const base = byAmount || {
    paymentStatus: 'paid',
    planLabel: cleanString(session.metadata?.plan_label || session.metadata?.plan || session.metadata?.product || 'Paid plan', 80),
    planName: cleanString(session.metadata?.plan_name || session.metadata?.plan_label || session.metadata?.plan || session.metadata?.product || 'Paid plan', 80),
    type: cleanString(session.metadata?.profile_type || session.metadata?.type || 'Independent driver / self-insured - $29.99/mo', 120),
  };

  return {
    ...base,
    priceId: cleanString(session.metadata?.price_id || session.metadata?.stripe_price_id || '', 120),
    subscriptionStatus: session.payment_status === 'paid' ? 'active' : 'incomplete',
    paidAt: new Date().toISOString(),
    currentPeriodEnd: cleanString(session.subscription?.current_period_end ? new Date(session.subscription.current_period_end * 1000).toISOString() : '', 80),
    canceledAt: '',
    cancelAtPeriodEnd: false,
  };
}

function invoicePaymentInfo(invoice, eventType) {
  const subscriptionId = cleanString(invoice.subscription || '', 120);
  const status = eventType === 'invoice.payment_failed' ? 'past_due' : 'active';
  return {
    paymentStatus: status === 'active' ? 'paid' : status,
    planLabel: cleanString(invoice.lines?.data?.[0]?.price?.nickname || invoice.lines?.data?.[0]?.price?.product || invoice.metadata?.plan_label || invoice.metadata?.plan || 'Paid plan', 80),
    planName: cleanString(invoice.lines?.data?.[0]?.price?.nickname || invoice.lines?.data?.[0]?.price?.product || invoice.metadata?.plan_name || invoice.metadata?.plan || 'Paid plan', 80),
    priceId: cleanString(invoice.lines?.data?.[0]?.price?.id || invoice.metadata?.price_id || '', 120),
    type: cleanString(invoice.metadata?.profile_type || invoice.metadata?.type || 'Independent driver / self-insured - $29.99/mo', 120),
    subscriptionStatus: status,
    paidAt: eventType === 'invoice.paid' ? new Date().toISOString() : '',
    currentPeriodEnd: cleanString(invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000).toISOString() : '', 80),
    canceledAt: '',
    cancelAtPeriodEnd: false,
    subscriptionId,
  };
}

function subscriptionPaymentInfo(subscription, eventType) {
  const eventSuffix = eventType.split('.').pop();
  const status = eventType === 'customer.subscription.deleted'
    ? 'canceled'
    : eventType === 'customer.subscription.trial_will_end'
      ? 'trialing'
      : normalizeSubscriptionStatus(subscription.status || eventSuffix);
  const planLabel = cleanString(subscription.items?.data?.[0]?.price?.nickname || subscription.items?.data?.[0]?.price?.product || subscription.metadata?.plan_label || subscription.metadata?.plan || 'Paid plan', 80);
  const priceId = cleanString(subscription.items?.data?.[0]?.price?.id || subscription.metadata?.price_id || '', 120);
  const type = cleanString(subscription.metadata?.profile_type || subscription.metadata?.type || 'Independent driver / self-insured - $29.99/mo', 120);
  return {
    paymentStatus: status === 'active' || status === 'trialing' ? 'paid' : status,
    planLabel,
    planName: planLabel,
    priceId,
    type,
    subscriptionStatus: status,
    paidAt: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : new Date().toISOString(),
    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : '',
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : '',
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    graceUntil: subscription.status === 'past_due' && subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : '',
    trialAllowed: Boolean(subscription.trial_end || subscription.trial_start || subscription.metadata?.trial_allowed === 'true' || subscription.metadata?.trial_configured === 'true'),
  };
}

async function resolveAccount(env, { userId, email, customerId, subscriptionId }) {
  if (userId) {
    const byId = await readAccountByUserId(env, userId);
    if (byId) return byId;
  }
  if (customerId) {
    const customerUserId = await env.RELOCATION_MANAGER_LEADS.get(`stripe:customer:${cleanString(customerId, 160)}`);
    if (customerUserId) {
      const byCustomer = await readAccountByUserId(env, customerUserId);
      if (byCustomer) return byCustomer;
    }
  }
  if (subscriptionId) {
    const subUserId = await env.RELOCATION_MANAGER_LEADS.get(`stripe:subscription:${cleanString(subscriptionId, 160)}`);
    if (subUserId) {
      const bySub = await readAccountByUserId(env, subUserId);
      if (bySub) return bySub;
    }
  }
  if (email) {
    const byEmail = await readAccountByEmail(env, email);
    if (byEmail) return byEmail;
  }
  return null;
}

async function markLeadPaid(env, account, session, paymentInfo) {
  const email = normalizeEmail(account.email || session.customer_details?.email || session.customer_email || session.metadata?.email || session.client_reference_id);
  if (!email) return;
  const indexKey = `lead:email:${email}`;
  const leadId = await env.RELOCATION_MANAGER_LEADS.get(indexKey);
  const leadRaw = leadId ? await env.RELOCATION_MANAGER_LEADS.get(leadId) : null;
  const lead = leadRaw ? JSON.parse(leadRaw) : null;
  const tags = mergeTags(lead?.tags, paymentTags(paymentInfo)).filter((tag) => tag !== 'new-lead');
  const updated = {
    ...(lead || createShellLead(email, paymentInfo, session)),
    payment_status: paymentInfo.paymentStatus,
    payment_plan: paymentInfo.planLabel,
    stripe_customer_id: account.stripeCustomerId || session.customer || lead?.stripe_customer_id || '',
    stripe_session_id: account.stripeSessionId || session.id || lead?.stripe_session_id || '',
    stripe_subscription_id: account.stripeSubscriptionId || session.subscription || lead?.stripe_subscription_id || '',
    paid_at: new Date().toISOString(),
    tags,
    user_id: account.userId,
  };
  await env.RELOCATION_MANAGER_LEADS.put(indexKey, updated.id);
  await env.RELOCATION_MANAGER_LEADS.put(updated.id, JSON.stringify(updated), {
    metadata: {
      email: updated.email,
      type: updated.type,
      created_at: updated.created_at,
    },
  });
}

function createShellLead(email, paymentInfo, session) {
  const now = new Date().toISOString();
  return {
    id: `lead:${now}-${crypto.randomUUID()}`,
    name: session.customer_details?.name || email.split('@')[0],
    email,
    phone: session.customer_details?.phone || '',
    company: session.customer_details?.company || '',
    type: paymentInfo.type || 'Independent driver / self-insured - $29.99/mo',
    equipment: '',
    pickup_area: '',
    preferred_lane: '',
    min_rate: '',
    instagram: '',
    notes: 'Created from Stripe payment success.',
    consent: true,
    created_at: now,
    updated_at: now,
    source: 'stripe-checkout',
    verification_status: 'paid',
    payment_status: paymentInfo.paymentStatus,
    payment_plan: paymentInfo.planLabel,
    submission_count: 1,
    consent_to_communications: true,
    tags: dedupeTags(['new-lead', 'payment-success', ...paymentTags(paymentInfo)]),
  };
}

function mergeTags(existing, additions) {
  return dedupeTags([...(Array.isArray(existing) ? existing : []), ...(additions || [])]);
}

function stripeEventKey(eventId) {
  return `stripe:event:${String(eventId || '').trim()}`;
}

async function verifyStripeSignature(payload, signatureHeader, secret) {
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const signedPayload = `${parts.t}.${payload}`;
  return await verifyHmac(signedPayload, secret, parts.v1);
}

async function verifyHmac(signedPayload, secret, expected) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const digest = arrayBufferToHex(sig);
  return constantTimeEqual(digest, expected);
}

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, stripe-signature',
  };
}
