import {
  cleanNumber,
  cleanString,
  authRedirectPath,
  deleteResetRecord,
  readResetRecord,
  consumeVerificationRecord,
  createPasswordResetToken,
  createSession,
  createEmailVerificationToken,
  ensureAccountShape,
  emailVerified,
  getSessionToken,
  issueCsrfToken,
  validateCsrfToken,
  hashPassword,
  isEntitled,
  loadAccessFromType,
  makeAccessCode,
  memberAccessPayload,
  normalizeEmail,
  normalizeProfileView,
  normalizeBulletinColor,
  normalizeCommunicationPrivacy,
  normalizeBoolean,
  normalizeLanguageList,
  normalizeSubscriptionStatus,
  publicProfile,
  readAccountByEmail,
  readAccountByUserId,
  readCurrentAccount,
  removeSession,
  removeSessionsForUser,
  roleFromType,
  safeAccountResponse,
  accessRoute,
  dashboardRoute,
  sessionCookie,
  clearSessionCookie,
  truckCountFromType,
  upsertAccount,
  updateAccountPassword,
  verifyPassword,
  subscriptionAccessDecision,
  isProfileComplete,
  tokenHash,
} from './_auth.js';

import { recordAuditEvent, recordAuthAuditEvent } from '../lib/audit.js';
import { readLoadHistory, summarizeLoadHistory } from '../lib/load-history.js';
import { makePasswordResetUrl, sendPasswordResetEmail } from '../lib/email.js';
import { normalizeMarketingAttribution } from '../lib/marketing-attribution.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const csrf = issueCsrfToken(request);
    await rememberIssuedCsrfToken(env, csrf.token);
    const session = getSessionToken(request);
    if (!session) {
      return json({ ok: true, session: null, profile: null, memberAccess: { authenticated: false, emailVerified: false, subscriptionStatus: 'unpaid', entitled: false }, csrfToken: csrf.token }, 200, csrf.headers);
    }


    const current = await readCurrentAccount(request, env);
    if (!current.account) {
      return json({ ok: true, session: null, profile: null, memberAccess: { authenticated: false, emailVerified: false, subscriptionStatus: 'unpaid', entitled: false }, csrfToken: csrf.token }, 401, mergeHeaderObjects(clearSessionCookie(request), csrf.headers));
    }

    const account = ensureAccountShape(current.account);
    const payload = {
      ok: true,
      session: {
        userId: account.userId,
        email: account.email,
        authenticated: true,
      },
      profile: publicProfile(account),
      memberAccess: memberAccessPayload(account),
      profileView: account.profileView || 'driver',
      dashboardRoute: dashboardRoute(account),
      accessRoute: accessRoute(account),
      redirectPath: authRedirectPath(account),
      csrfToken: csrf.token,
    };

    if (isEntitled(account)) {
      Object.assign(payload, safeAccountResponse(account));
      payload.loadHistory = await readLoadHistory(env, account.userId, 150);
      payload.reputationActivity = summarizeLoadHistory(payload.loadHistory);
    }

    return json(payload);
  } catch {
    return json({ ok: false, error: 'Account lookup failed.' }, 500);
  }
}

export async function onRequestPost(context) {
  return handleMutation(context);
}

export async function onRequestPut(context) {
  return handleMutation(context);
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const session = getSessionToken(request);
    if (session) {
      await removeSession(env, session);
    }
    return json({ ok: true }, 200, clearSessionCookie(request));
  } catch {
    return json({ ok: false, error: 'Logout failed.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function handleMutation(context) {
  const { request, env } = context;
  try {
    const body = await readBody(request);
    const action = String(body.action || 'save').toLowerCase();

    if (!sameOriginRequest(request)) {
      return json({ ok: false, error: 'Request blocked.' }, 403);
    }

    if (action === 'register') {
      const profile = normalizeProfile(body.profile || body);
      if (!(await validatePublicMutationCsrf(env, request, body))) {
        return csrfExpiredResponse(env, request);
      }
      if (!profile.email || !profile.name) {
        return json({ ok: false, error: 'Name and email are required.' }, 400);
      }
      if (!isProfileComplete(profile)) {
        return json({ ok: false, error: 'Add your company and account type to complete your profile.' }, 400);
      }

      const password = String(body.password || profile.password || '').trim();
      if (!password) {
        return json({ ok: false, error: 'Password is required.' }, 400);
      }

      const existing = await readAccountByEmail(env, profile.email);
      if (existing && existing.passwordHash) {
        return json({
          ok: false,
          error: 'Account already exists. Sign in instead.',
          existingAccount: true,
          signInPath: `/signin?email=${encodeURIComponent(profile.email)}`,
        }, 409);
      }

      const userId = existing?.userId || `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
      const { salt, hash } = await hashPassword(password);
      const verificationToken = await createEmailVerificationToken(env, userId);
      const now = new Date().toISOString();
      const account = ensureAccountShape({
        ...(existing || {}),
        ...profile,
        userId,
        passwordSalt: salt,
        passwordHash: hash,
        accessCode: existing?.accessCode || makeAccessCode(),
        emailVerificationSentAt: now,
        verification: existing?.verification || 'Pending email verification',
        note: existing?.note || 'Please verify your email before subscription access is activated.',
        subscriptionStatus: normalizeSubscriptionStatus(existing?.subscriptionStatus || existing?.paymentStatus || 'unpaid'),
        paymentStatus: existing?.paymentStatus || 'unpaid_waitlist',
        paidAt: existing?.paidAt || '',
        planLabel: existing?.planLabel || cleanString(body.checkoutPlan || profile.planLabel || '', 80) || null,
        loadAccess: loadAccessFromType(profile.type || existing?.type, existing?.paymentStatus || 'unpaid_waitlist'),
        role: roleFromType(profile.type || existing?.type),
        profileView: normalizeProfileView(body.profileView || existing?.profileView || 'driver'),
        truckCount: cleanNumber(profile.truckCount || existing?.truckCount) || truckCountFromType(profile.type || existing?.type),
        recentLoads: existing?.recentLoads || [],
        recentRequests: existing?.recentRequests || [],
        requestBids: existing?.requestBids || {},
        messages: existing?.messages || [],
        plannedTrips: existing?.plannedTrips || [],
        activePickups: existing?.activePickups || [],
        laneAlerts: existing?.laneAlerts || [],
        customerRatings: existing?.customerRatings || [],
        verifiedTransactions: existing?.verifiedTransactions || [],
        communicationPrivacy: existing?.communicationPrivacy || { emailVisible: false, phoneVisible: false, directMessages: true, loadMessages: true, companyMessages: true, channelMessages: true, mentions: true },
        username: existing?.username || '',
        phone: existing?.phone || '',
        city: existing?.city || '',
        state: existing?.state || '',
        equipmentType: existing?.equipmentType || '',
        equipmentTypes: existing?.equipmentTypes || [],
        checkoutPlan: cleanString(body.checkoutPlan || existing?.checkoutPlan || '', 80) || null,
        marketingAttribution: Object.keys(existing?.marketingAttribution || {}).length
          ? existing.marketingAttribution
          : normalizeMarketingAttribution(body.marketingAttribution),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      }, existing || {});

      const saved = await upsertAccount(env, account);
      const rememberMe = normalizeBoolean(body.rememberMe || body.remember_me, false);
      const session = await createSession(env, saved.userId, { email: saved.email, rememberMe }, { rememberMe });
      const response = {
        ok: true,
        profile: publicProfile(saved),
        memberAccess: memberAccessPayload(saved),
        profileView: saved.profileView || 'driver',
        verificationRequired: !emailVerified(saved),
        dashboardRoute: dashboardRoute(saved),
        accessRoute: accessRoute(saved),
        verificationToken,
        verificationUrl: `/?verify_token=${encodeURIComponent(verificationToken)}&email=${encodeURIComponent(saved.email)}#verify`,
      };
      if (isEntitled(saved)) {
        Object.assign(response, safeAccountResponse(saved));
      }

      await recordAuditEvent(env, {
        actionType: 'account.register',
        actorUserId: saved.userId,
        actorRole: saved.role,
        targetType: 'account',
        targetId: saved.userId,
        after: { profile: publicProfile(saved), memberAccess: memberAccessPayload(saved) },
        meta: { source: 'api/account' },
      });

      if (wantsHtml(request)) {
        return redirect('/index.html#verify', mergeHeaderObjects(sessionCookie(request, session, { rememberMe }), issueCsrfToken(request).headers));
      }

      return json(response, 200, mergeHeaderObjects(sessionCookie(request, session, { rememberMe }), issueCsrfToken(request).headers));
    }

    if (action === 'login') {
      const validCsrf = await validatePublicMutationCsrf(env, request, body);
      if (!validCsrf) {
        return csrfExpiredResponse(env, request);
      }
      const email = normalizeEmail(body.email);
      const secret = String(body.password || body.accessCode || body.access_code || '').trim();
      const rememberMe = normalizeBoolean(body.rememberMe || body.remember_me, false);
      if (!email || !secret) {
        return json({ ok: false, error: 'Email and password are required.' }, 400);
      }

      if (!isValidEmailAddress(email)) {
        return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
      }

      const ip = clientIp(request);
      const authRequestId = crypto.randomUUID();
      const throttle = await readLoginThrottle(env, email, ip);
      if (throttle.lockedUntil && throttle.lockedUntil > Date.now()) {
        await slowDownLogin(throttle.failedCount);
        await recordAuthAuditEvent(env, {
          actionType: 'account.login_locked',
          outcome: 'rejected',
          reasonCode: 'throttled',
          requestId: authRequestId,
          failedCount: throttle.failedCount,
        });
        return json({ ok: false, error: 'We are having trouble signing you in right now. Please try again.' }, 429);
      }

      const account = await readAccountByEmail(env, email);
      const passwordMatch = account?.passwordHash ? await verifyPassword(secret, account.passwordSalt, account.passwordHash) : false;
      const accessCodeMatch = account?.accessCode ? String(account.accessCode) === secret : false;
      if (!account || (!passwordMatch && !accessCodeMatch)) {
        const failures = Number(throttle.failedCount || 0) + 1;
        const lockedUntil = failures >= 5 ? Date.now() + (5 * 60 * 1000) : Number(throttle.lockedUntil || 0);
        await writeLoginThrottle(env, email, ip, { failedCount: failures, lockedUntil, lastAttemptAt: Date.now() });
        await slowDownLogin(failures);
        await recordAuthAuditEvent(env, {
          actionType: 'account.login_failed',
          userId: account?.userId || '',
          role: account?.role || '',
          outcome: 'rejected',
          reasonCode: 'invalid_credentials',
          requestId: authRequestId,
          failedCount: failures,
        });
        if (lockedUntil && lockedUntil > Date.now()) {
          return json({ ok: false, error: 'We are having trouble signing you in right now. Please try again.' }, 429);
        }
        return json({ ok: false, error: 'The email or password is incorrect.' }, 401);
      }

      const session = await createSession(env, account.userId, { email: account.email, rememberMe }, { rememberMe });
      const saved = ensureAccountShape(account);
      await clearLoginThrottle(env, email, ip);
      const response = {
        ok: true,
        profile: publicProfile(saved),
        memberAccess: memberAccessPayload(saved),
        profileView: saved.profileView || 'driver',
        verificationRequired: !emailVerified(saved),
        subscriptionRequired: !isEntitled(saved),
        dashboardRoute: dashboardRoute(saved),
        accessRoute: accessRoute(saved),
        redirectPath: authRedirectPath(saved, { redirectTarget: body.redirect || '' }),
      };
      if (isEntitled(saved)) {
        Object.assign(response, safeAccountResponse(saved));
      }

      response.notice = 'Welcome back to Relocation Manager USA.';
      if (!emailVerified(saved)) {
        response.error = 'Your account needs email verification.';
      } else if (response.memberAccess.billingAttention) {
        response.notice = 'Your subscription needs attention. Update billing to continue using paid features.';
      }

      if (wantsHtml(request)) {
        return redirect(response.redirectPath || authRedirectPath(saved, { redirectTarget: body.redirect || '' }), mergeHeaderObjects(sessionCookie(request, session, { rememberMe }), issueCsrfToken(request).headers));
      }

      return json(response, 200, mergeHeaderObjects(sessionCookie(request, session, { rememberMe }), issueCsrfToken(request).headers));
    }

    if (action === 'verify-email') {
      if (!validateCsrfToken(request, body)) {
        const csrf = issueCsrfToken(request);
        return json({ ok: false, error: 'Session expired. Refresh the page and try again.', csrfToken: csrf.token }, 403, csrf.headers);
      }

      const token = String(body.token || body.verificationToken || '').trim();
      if (!token) {
        return json({ ok: false, error: 'Verification token is required.' }, 400);
      }

      const userId = await consumeVerificationRecord(env, token);
      if (!userId) {
        return json({ ok: false, error: 'That verification link expired or is invalid.' }, 400);
      }

      const account = await readAccountByUserId(env, userId);
      if (!account) {
        return json({ ok: false, error: 'Account not found.' }, 404);
      }

      const verified = ensureAccountShape({
        ...account,
        emailVerifiedAt: new Date().toISOString(),
        verification: 'Email verified',
        updatedAt: new Date().toISOString(),
      }, account);
      const saved = await upsertAccount(env, verified);
      const session = await createSession(env, saved.userId, { email: saved.email }, { rememberMe: false });

      const response = {
        ok: true,
        profile: publicProfile(saved),
        memberAccess: memberAccessPayload(saved),
        profileView: saved.profileView || 'driver',
        dashboardRoute: dashboardRoute(saved),
        accessRoute: accessRoute(saved),
      };
      if (isEntitled(saved)) {
        Object.assign(response, safeAccountResponse(saved));
      }

      await recordAuditEvent(env, {
        actionType: 'account.email_verified',
        actorUserId: saved.userId,
        actorRole: saved.role,
        targetType: 'account',
        targetId: saved.userId,
        after: { profile: publicProfile(saved), memberAccess: memberAccessPayload(saved) },
        meta: { source: 'api/account', tokenAction: 'verify-email' },
      });

      return json(response, 200, mergeHeaderObjects(sessionCookie(request, session), issueCsrfToken(request).headers));
    }

    if (action === 'resend-verification') {
      if (!validateCsrfToken(request, body)) {
        const csrf = issueCsrfToken(request);
        return json({ ok: false, error: 'Session expired. Refresh the page and try again.', csrfToken: csrf.token }, 403, csrf.headers);
      }
      const email = normalizeEmail(body.email);
      if (!email) {
        return json({ ok: false, error: 'Email is required.' }, 400);
      }
      const account = await readAccountByEmail(env, email);
      if (!account) {
        return json({ ok: true, sent: false });
      }
      if (emailVerified(account)) {
        return json({ ok: true, sent: false, verified: true });
      }
      const token = await createEmailVerificationToken(env, account.userId);
      const updated = ensureAccountShape({
        ...account,
        emailVerificationSentAt: new Date().toISOString(),
        verification: 'Pending email verification',
        updatedAt: new Date().toISOString(),
      }, account);
      await upsertAccount(env, updated);
      await recordAuditEvent(env, {
        actionType: 'account.resend_verification',
        actorUserId: updated.userId,
        actorRole: updated.role,
        targetType: 'account',
        targetId: updated.userId,
        before: { emailVerificationSentAt: account.emailVerificationSentAt || '' },
        after: { emailVerificationSentAt: updated.emailVerificationSentAt || '' },
        meta: { source: 'api/account' },
      });
      return json({ ok: true, sent: true, verificationUrl: `/?verify_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}#verify` });
    }

    if (action === 'request-reset') {
      if (!(await validatePublicMutationCsrf(env, request, body))) {
        return csrfExpiredResponse(env, request);
      }
      const email = normalizeEmail(body.email);
      if (!email) {
        return json({ ok: false, error: 'Email is required.' }, 400);
      }

      if (!env?.EMAIL?.send && !String(env?.RESEND_API_KEY || '').trim()) {
        return json({ ok: false, error: 'Password reset email is temporarily unavailable. Please contact support.' }, 503);
      }

      const resetThrottle = await readResetThrottle(env, email, clientIp(request));
      if (resetThrottle.retryAfter > Date.now()) {
        return json({ ok: true, accepted: true, message: 'If that account exists, a reset email has been sent.' });
      }
      await writeResetThrottle(env, email, clientIp(request));

      const account = await readAccountByEmail(env, email);
      if (!account) {
        return json({ ok: true, accepted: true, message: 'If that account exists, a reset email has been sent.' });
      }
      const token = await createPasswordResetToken(env, account.userId);
      const resetUrl = makePasswordResetUrl({ token, email, origin: new URL(request.url).origin });
      const deliveryRequestId = crypto.randomUUID();

      try {
        await sendPasswordResetEmail(env, {
          to: email,
          resetUrl,
          name: account.name || '',
          requestId: deliveryRequestId,
        });
      } catch (error) {
        console.error(JSON.stringify({
          event: 'password_reset_email_failed',
          requestId: deliveryRequestId,
          userId: account.userId,
          reasonCode: 'provider_error',
        }));
        return json({ ok: false, error: 'We could not send the reset email right now. Please try again later.' }, 503);
      }

      try {
        await recordAuthAuditEvent(env, {
          actionType: 'account.password_reset_requested',
          userId: account.userId,
          role: account.role,
          outcome: 'accepted',
          reasonCode: 'email_delivery_accepted',
          requestId: deliveryRequestId,
        });
      } catch (error) {
        // The reset token exists and the provider already accepted the email.
        // Bookkeeping must not turn that successful delivery into a false 500.
        console.error('Password reset request audit write failed.');
      }
      return json({ ok: true, accepted: true, message: 'If that account exists, a reset email has been sent.' });
    }

    if (action === 'billing-portal') {
      if (!validateCsrfToken(request, body)) {
        const csrf = issueCsrfToken(request);
        return json({ ok: false, error: 'Session expired. Refresh the page and try again.', csrfToken: csrf.token }, 403, csrf.headers);
      }
      const current = await readCurrentAccount(request, env);
      if (!current.account) {
        return json({ ok: false, error: 'Not signed in.' }, 401);
      }

      const account = ensureAccountShape(current.account);
      const customerId = String(account.stripeCustomerId || '').trim();
      if (!customerId) {
        return json({ ok: false, error: 'No Stripe customer is linked to this account.' }, 403);
      }

      const mappedUserId = await env.RELOCATION_MANAGER_LEADS.get(`stripe:customer:${customerId}`);
      if (mappedUserId && mappedUserId !== account.userId) {
        return json({ ok: false, error: 'That billing record does not belong to this account.' }, 403);
      }

      const secret = env.STRIPE_SECRET_KEY;
      if (!secret) {
        return json({ ok: false, error: 'Stripe secret key is not configured.' }, 500);
      }

      const returnUrl = new URL('/account/billing', request.url).origin + '/account/billing';
      const form = new URLSearchParams({
        customer: customerId,
        return_url: returnUrl,
      });
      const portal = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const portalData = await portal.json().catch(() => null);
      if (!portal.ok || !portalData?.url) {
        return json({ ok: false, error: portalData?.error?.message || 'Could not start billing portal.' }, 502);
      }

      return json({ ok: true, url: portalData.url, customerId, accessRoute: subscriptionAccessDecision(account).route });
    }

    if (action === 'reset-password') {
      if (!(await validatePublicMutationCsrf(env, request, body))) {
        return csrfExpiredResponse(env, request);
      }
      const resetRequestId = crypto.randomUUID();
      const token = String(body.token || body.resetToken || '').trim();
      const password = String(body.password || '').trim();
      if (!token || !password) {
        await recordAuthAuditSafely(env, {
          actionType: 'account.password_reset_rejected',
          outcome: 'rejected',
          reasonCode: 'missing_fields',
          requestId: resetRequestId,
        });
        return json({ ok: false, error: 'Reset token and new password are required.' }, 400);
      }
      if (password.length < 12) {
        await recordAuthAuditSafely(env, {
          actionType: 'account.password_reset_rejected',
          outcome: 'rejected',
          reasonCode: 'weak_password',
          requestId: resetRequestId,
        });
        return json({ ok: false, error: 'Use at least 12 characters for your new password.' }, 400);
      }
      const userId = await readResetRecord(env, token);
      if (!userId) {
        await recordAuthAuditSafely(env, {
          actionType: 'account.password_reset_rejected',
          outcome: 'rejected',
          reasonCode: 'invalid_or_expired_token',
          requestId: resetRequestId,
        });
        return json({ ok: false, error: 'That reset link expired or is invalid.' }, 400);
      }
      const account = await readAccountByUserId(env, userId);
      if (!account) {
        await recordAuthAuditSafely(env, {
          actionType: 'account.password_reset_rejected',
          userId,
          outcome: 'rejected',
          reasonCode: 'account_not_found',
          requestId: resetRequestId,
        });
        return json({ ok: false, error: 'Account not found.' }, 404);
      }
      const { salt, hash } = await hashPassword(password);
      const changedAt = new Date().toISOString();
      const saved = await updateAccountPassword(env, account, { salt, hash, changedAt });
      let revoked;
      try {
        revoked = await removeSessionsForUser(env, saved.userId, {
          requireAllStores: true,
        });
      } catch (error) {
        await recordAuthAuditSafely(env, {
          actionType: 'account.password_reset_rejected',
          userId: saved.userId,
          role: saved.role,
          outcome: 'rejected',
          reasonCode: 'session_revocation_failed',
          requestId: resetRequestId,
        });
        throw error;
      }
      await deleteResetRecord(env, token);
      const session = await createSession(
        env,
        saved.userId,
        { email: saved.email, passwordResetAt: changedAt },
      );
      const csrf = issueCsrfToken(request);
      await rememberIssuedCsrfToken(env, csrf.token);
      const response = {
        ok: true,
        profile: publicProfile(saved),
        memberAccess: memberAccessPayload(saved),
        dashboardRoute: dashboardRoute(saved),
        accessRoute: accessRoute(saved),
        redirectPath: authRedirectPath(saved),
        csrfToken: csrf.token,
        notice: 'Password updated. You are signed in.',
      };
      if (isEntitled(saved)) {
        Object.assign(response, safeAccountResponse(saved));
      }
      try {
        await recordAuthAuditEvent(env, {
          actionType: 'account.password_reset_completed',
          userId: saved.userId,
          role: saved.role,
          outcome: 'completed',
          reasonCode: 'password_changed',
          sessionStores: revoked,
        });
      } catch (error) {
        // Password persistence and token invalidation already succeeded. Audit
        // storage is important, but it must not falsely report that the user's
        // new password failed to save.
        console.error('Password reset audit write failed.');
      }
      return json(
        response,
        200,
        mergeHeaderObjects(sessionCookie(request, session), csrf.headers),
      );
    }

    const current = await readCurrentAccount(request, env);
    if (!current.account) {
      return json({ ok: false, error: 'Not signed in.' }, 401);
    }

    const account = ensureAccountShape(current.account);
    const isProfileCompletion = action === 'complete-profile';
    if (!isEntitled(account) && !isProfileCompletion) {
      return json({ ok: false, error: 'Complete your email verification and monthly subscription to access member account features.', accessRoute: accessRoute(account) }, 403);
    }

    if (containsForbiddenBillingMutation(body, {
      ignoreProfileType: isProfileCompletion,
    })) {
      return json({ ok: false, error: 'Subscription and billing fields can only be updated by the server.' }, 403);
    }

    const beforeProfile = publicProfile(account);
    const next = isProfileCompletion ? mergeProfileCompletionPatch(account, body) : mergeAccountPatch(account, body);
    if (isProfileCompletion && !isProfileComplete(next)) {
      return json({ ok: false, error: 'Add your name, account type, and company to complete your profile.' }, 400);
    }
    const saved = await upsertAccount(env, next);
    const response = {
      ok: true,
      profile: publicProfile(saved),
      memberAccess: memberAccessPayload(saved),
      profileView: saved.profileView || 'driver',
      dashboardRoute: dashboardRoute(saved),
      accessRoute: accessRoute(saved),
      redirectPath: authRedirectPath(saved),
      notice: isProfileCompletion
        ? 'Company profile saved. You are still signed in.'
        : 'Account updated.',
    };
    if (isEntitled(saved)) Object.assign(response, safeAccountResponse(saved));
    await recordAuditEvent(env, {
      actionType: 'account.update',
      actorUserId: saved.userId,
      actorRole: saved.role,
      targetType: 'account',
      targetId: saved.userId,
      before: { profile: beforeProfile },
      after: { profile: publicProfile(saved) },
      meta: { source: 'api/account' },
    });
    return json(response);
  } catch (error) {
    console.error('Account mutation failed.', error);
    return json({ ok: false, error: 'Account save failed.' }, 500);
  }
}

function mergeProfileCompletionPatch(current, body) {
  const profile = normalizeProfile(body.profile || body);
  const editable = pickEditableProfile(profile);
  editable.type = current.type || editable.type;
  return ensureAccountShape({
    ...current,
    ...editable,
    marketingAttribution: Object.keys(current.marketingAttribution || {}).length
      ? current.marketingAttribution
      : normalizeMarketingAttribution(body.marketingAttribution),
    updatedAt: new Date().toISOString(),
  }, current);
}

function mergeAccountPatch(current, body) {
  const profile = normalizeProfile(body.profile || body);
  const editable = pickEditableProfile(profile);
  for (const [key, value] of Object.entries(editable)) {
    if (value === '' && current[key]) editable[key] = current[key];
    if (Array.isArray(value) && value.length === 0 && Array.isArray(current[key])) {
      editable[key] = current[key];
    }
  }
  const insuranceChanged = Boolean(
    profile.insuranceProvider ||
      profile.insurancePolicyLast4 ||
      profile.insuranceExpiration ||
      profile.insuranceDocumentUrl,
  );
  return ensureAccountShape({
    ...current,
    ...editable,
    logoUrl: profile.logoUrl || current.logoUrl || '',
    bulletinColor: normalizeBulletinColor(
      profile.bulletinColor || current.bulletinColor,
    ),
    insuranceProvider:
      profile.insuranceProvider || current.insuranceProvider || '',
    insurancePolicyLast4:
      profile.insurancePolicyLast4 || current.insurancePolicyLast4 || '',
    insuranceExpiration:
      profile.insuranceExpiration || current.insuranceExpiration || '',
    insuranceDocumentUrl:
      profile.insuranceDocumentUrl || current.insuranceDocumentUrl || '',
    insuranceStatus: insuranceChanged
      ? 'Pending review'
      : current.insuranceStatus || 'Not submitted',
    profileView: normalizeProfileView(body.profileView || current.profileView || 'driver'),
    communicationPrivacy: normalizeCommunicationPrivacy(body.communicationPrivacy || body.privacy || current.communicationPrivacy || {}),
    recentLoads: Array.isArray(body.recentLoads) ? body.recentLoads.slice(0, 12) : current.recentLoads || [],
    recentRequests: Array.isArray(body.recentRequests) ? body.recentRequests.slice(0, 12) : current.recentRequests || [],
    requestBids: normalizeBidMap(body.requestBids) || current.requestBids || {},
    messages: Array.isArray(body.messages) ? body.messages.slice(0, 24) : current.messages || [],
    plannedTrips: Array.isArray(body.plannedTrips) ? body.plannedTrips.slice(0, 12) : current.plannedTrips || [],
    // Pickup lifecycle state is written only by server-side load workflows.
    // Member profile saves must never create or advance pickup evidence.
    activePickups: current.activePickups || [],
    laneAlerts: Array.isArray(body.laneAlerts) ? body.laneAlerts.slice(0, 12) : current.laneAlerts || [],
    notifications: Array.isArray(body.notifications) ? body.notifications.slice(0, 30) : current.notifications || [],
    customerRatings: Array.isArray(body.customerRatings) ? body.customerRatings.slice(0, 20) : current.customerRatings || [],
    // Transaction evidence is written only by server-side completion/verification
    // flows. Never accept it from a member profile save.
    verifiedTransactions: current.verifiedTransactions || [],
    trustDisputes: Array.isArray(body.trustDisputes) ? body.trustDisputes.slice(0, 24) : current.trustDisputes || [],
    // Trust score-adjustment history is server-authoritative: syncTrustAudit
    // turns these entries into `trust.score_adjustment` audit-log records, so a
    // member profile save must never create or alter them. trustDisputes stays
    // member-writable above — it backs the live dispute form (member.html/app.js).
    trustAudit: current.trustAudit || [],
    checkoutPlan: cleanString(body.checkoutPlan || current.checkoutPlan, 80) || current.checkoutPlan || null,
    updatedAt: new Date().toISOString(),
  }, current);
}

function pickEditableProfile(profile) {
  return {
    name: cleanString(profile.name, 120),
    company: cleanString(profile.company, 160),
    type: cleanString(profile.type, 120),
    mc_dot: cleanString(profile.mc_dot, 80),
    insuranceProvider: cleanString(profile.insuranceProvider, 120),
    insurancePolicyLast4: cleanString(profile.insurancePolicyLast4, 4).replace(/\D/g, ''),
    insuranceExpiration: cleanString(profile.insuranceExpiration, 10),
    insuranceDocumentUrl: normalizeHttpDocumentUrl(profile.insuranceDocumentUrl),
    preferredLanguage: cleanString(profile.preferredLanguage || profile.language, 8) || 'en',
    additionalLanguages: normalizeLanguageList(profile.additionalLanguages || profile.additional_languages || []),
    preferredTranslationLanguage: cleanString(profile.preferredTranslationLanguage || profile.translationLanguage || profile.translation_language || profile.languagePreference || profile.language_preference || profile.preferredLanguage || profile.language, 8) || cleanString(profile.preferredLanguage || profile.language, 8) || 'en',
    autoTranslateMessages: normalizeBoolean(profile.autoTranslateMessages ?? profile.auto_translate_messages, false),
    alwaysShowOriginalMessages: normalizeBoolean(profile.alwaysShowOriginalMessages ?? profile.always_show_original_messages, true),
    transcribeAndTranslateVoiceNotes: normalizeBoolean(profile.transcribeAndTranslateVoiceNotes ?? profile.transcribe_and_translate_voice_notes, true),
    showLanguagesSpoken: normalizeBoolean(profile.showLanguagesSpoken ?? profile.show_languages_spoken ?? profile.languageVisibility ?? profile.language_visibility, false),
    notificationPreferences: profile.notificationPreferences && typeof profile.notificationPreferences === 'object' ? profile.notificationPreferences : {},
    note: cleanString(profile.note, 280),
    truckCount: cleanNumber(profile.truckCount ?? profile.truck_count),
    username: cleanString(profile.username, 40),
    phone: cleanString(profile.phone, 40),
    city: cleanString(profile.city, 80),
    state: cleanString(profile.state, 40),
    equipmentType: cleanString(profile.equipmentType, 120),
    equipmentTypes: Array.isArray(profile.equipmentTypes) ? profile.equipmentTypes.slice(0, 12).map((item) => cleanString(item, 80)) : [],
    logoUrl: normalizeHttpImageUrl(profile.logoUrl),
    bulletinColor: normalizeBulletinColor(profile.bulletinColor),
  };
}

function normalizeProfile(input) {
  return {
    name: cleanString(input.name, 120),
    company: cleanString(input.company, 160),
    email: normalizeEmail(input.email),
    type: cleanString(input.type, 120),
    truckCount: cleanNumber(input.truckCount ?? input.truck_count) || truckCountFromType(input.type),
    mc_dot: cleanString(input.mc_dot, 80),
    insuranceProvider: cleanString(input.insuranceProvider, 120),
    insurancePolicyLast4: cleanString(input.insurancePolicyLast4, 4).replace(/\D/g, ''),
    insuranceExpiration: cleanString(input.insuranceExpiration, 10),
    insuranceDocumentUrl: normalizeHttpDocumentUrl(input.insuranceDocumentUrl),
    preferredLanguage: cleanString(input.preferredLanguage || input.language, 8) || 'en',
    additionalLanguages: normalizeLanguageList(input.additionalLanguages || input.additional_languages || []),
    preferredTranslationLanguage: cleanString(input.preferredTranslationLanguage || input.translationLanguage || input.translation_language || input.languagePreference || input.language_preference || input.preferredLanguage || input.language, 8) || cleanString(input.preferredLanguage || input.language, 8) || 'en',
    autoTranslateMessages: normalizeBoolean(input.autoTranslateMessages ?? input.auto_translate_messages, false),
    alwaysShowOriginalMessages: normalizeBoolean(input.alwaysShowOriginalMessages ?? input.always_show_original_messages, true),
    transcribeAndTranslateVoiceNotes: normalizeBoolean(input.transcribeAndTranslateVoiceNotes ?? input.transcribe_and_translate_voice_notes, true),
    showLanguagesSpoken: normalizeBoolean(input.showLanguagesSpoken ?? input.show_languages_spoken ?? input.languageVisibility ?? input.language_visibility, false),
    role: cleanString(input.role, 80),
    note: cleanString(input.note, 280),
    logoUrl: normalizeHttpImageUrl(input.logoUrl || input.logo_url),
    bulletinColor: normalizeBulletinColor(input.bulletinColor || input.bulletin_color),
  };
}

function normalizeHttpImageUrl(value) {
  const raw = cleanString(value, 280);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function normalizeHttpDocumentUrl(value) {
  const raw = cleanString(value, 360);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function normalizeBidMap(input) {
  if (!input || typeof input !== 'object') return null;
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Array.isArray(value)) continue;
    output[String(key)] = value.slice(0, 12).map((bid) => ({
      id: cleanString(bid.id, 80),
      requestId: cleanString(bid.requestId, 120),
      bidderName: cleanString(bid.bidderName, 120),
      bidderRole: cleanString(bid.bidderRole, 80),
      amount: cleanNumber(bid.amount) || 0,
      note: cleanString(bid.note, 200),
      createdAt: cleanString(bid.createdAt, 80),
    }));
  }
  return output;
}

function containsForbiddenBillingMutation(
  body = {},
  { ignoreProfileType = false } = {},
) {
  const forbidden = new Set([
    'subscription_status',
    'subscriptionStatus',
    'stripe_customer_id',
    'stripeCustomerId',
    'stripe_subscription_id',
    'stripeSubscriptionId',
    'stripe_price_id',
    'stripePriceId',
    'stripeSessionId',
    'stripe_session_id',
    'stripeLastEventCreatedAt',
    'stripe_last_event_created_at',
    'stripeLastEventId',
    'stripe_last_event_id',
    'stripeLastEventType',
    'stripe_last_event_type',
    'current_period_end',
    'subscriptionCurrentPeriodEnd',
    'subscriptionCurrentPeriodEnd',
    'subscriptionGraceUntil',
    'subscription_grace_until',
    'subscriptionCancelAtPeriodEnd',
    'subscription_cancel_at_period_end',
    'subscriptionTrialAllowed',
    'subscription_trial_allowed',
    'paymentStatus',
    'type',
    'loadAccess',
    'planPermissions',
    'plan_permissions',
    'adminRole',
    'admin_role',
    'role',
    'emailVerifiedAt',
    'email_verified_at',
    'emailVerificationTokenHash',
    'email_verification_token_hash',
    'emailVerificationExpiresAt',
    'email_verification_expires_at',
    'resetTokenHash',
    'reset_token_hash',
    'resetTokenExpiresAt',
    'reset_token_expires_at',
    'passwordHash',
    'password_hash',
    'passwordSalt',
    'password_salt',
  ]);

  const profileKeys = Object.keys(body?.profile || {}).filter(
    (key) => !(ignoreProfileType && key === 'type'),
  );
  const keys = [...Object.keys(body || {}), ...profileKeys];
  return keys.some((key) => forbidden.has(key));
}

function wantsHtml(request) {
  const accept = String(request.headers.get('accept') || '').toLowerCase();
  return accept.includes('text/html') || accept.includes('application/xhtml+xml');
}

function json(payload, status = 200, extraHeaders = {}) {
  const headers = new Headers(corsHeaders());
  headers.set('content-type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(extraHeaders || {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined && value !== null) {
      headers.set(key, value);
    }
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function redirect(location, extraHeaders = {}) {
  const headers = new Headers(corsHeaders());
  headers.set('location', location);
  for (const [key, value] of Object.entries(extraHeaders || {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined && value !== null) {
      headers.set(key, value);
    }
  }
  return new Response(null, { status: 303, headers });
}

function mergeHeaderObjects(...parts) {
  const output = {};
  for (const part of parts) {
    if (!part) continue;
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined || value === null) continue;
      if (key.toLowerCase() === 'set-cookie') {
        const existing = output[key];
        const nextValues = Array.isArray(value) ? value.filter(Boolean) : [value];
        output[key] = Array.isArray(existing) ? existing.concat(nextValues) : existing ? [existing].concat(nextValues) : nextValues;
      } else {
        output[key] = value;
      }
    }
  }
  return output;
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await request.json();
  }
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function sameOriginRequest(request) {
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function rememberIssuedCsrfToken(env, token) {
  if (!env?.RELOCATION_MANAGER_LEADS?.put || !token) return;
  try {
    const hash = await tokenHash(token);
    await env.RELOCATION_MANAGER_LEADS.put(
      `csrf:issued:${hash}`,
      '1',
      { expirationTtl: 30 * 60 },
    );
  } catch {
    // The normal double-submit cookie remains the primary validation path.
  }
}

async function validateIssuedCsrfToken(env, request) {
  if (!env?.RELOCATION_MANAGER_LEADS?.get) return false;
  const origin = String(request.headers.get('origin') || '').trim();
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  const token = String(request.headers.get('x-csrf-token') || request.headers.get('x-xsrf-token') || '').trim();
  if (!origin || !sameOriginRequest(request) || !contentType.includes('application/json') || token.length < 24) {
    return false;
  }
  try {
    const hash = await tokenHash(token);
    return Boolean(await env.RELOCATION_MANAGER_LEADS.get(`csrf:issued:${hash}`));
  } catch {
    return false;
  }
}

async function validatePublicMutationCsrf(env, request, body) {
  return (
    validateCsrfToken(request, body) ||
    (await validateIssuedCsrfToken(env, request))
  );
}

async function csrfExpiredResponse(env, request) {
  const csrf = issueCsrfToken(request);
  await rememberIssuedCsrfToken(env, csrf.token);
  return json(
    {
      ok: false,
      error: 'Session expired. Refresh the page and try again.',
      csrfToken: csrf.token,
    },
    403,
    csrf.headers,
  );
}

async function recordAuthAuditSafely(env, event) {
  try {
    await recordAuthAuditEvent(env, event);
  } catch {
    console.error('Authentication audit write failed.');
  }
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function safeJsonParse(value) {
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return null;
  }
}

function loginThrottleKey(email, ip) {
  return `auth:login:${String(email || '').trim().toLowerCase()}:${String(ip || 'unknown').trim().toLowerCase()}`;
}

async function readLoginThrottle(env, email, ip) {
  const key = loginThrottleKey(email, ip);
  if (!env?.RELOCATION_MANAGER_LEADS?.get) return { failedCount: 0, lockedUntil: 0 };
  const raw = await env.RELOCATION_MANAGER_LEADS.get(key);
  const parsed = raw ? safeJsonParse(raw) : null;
  return {
    failedCount: Number(parsed?.failedCount || 0),
    lockedUntil: Number(parsed?.lockedUntil || 0),
    lastAttemptAt: Number(parsed?.lastAttemptAt || 0),
  };
}

async function writeLoginThrottle(env, email, ip, state) {
  if (!env?.RELOCATION_MANAGER_LEADS?.put) return;
  const key = loginThrottleKey(email, ip);
  await env.RELOCATION_MANAGER_LEADS.put(key, JSON.stringify(state), { expirationTtl: 60 * 60 * 24 });
}

async function clearLoginThrottle(env, email, ip) {
  if (!env?.RELOCATION_MANAGER_LEADS?.delete) return;
  await env.RELOCATION_MANAGER_LEADS.delete(loginThrottleKey(email, ip));
}

function resetThrottleKey(email, ip) {
  return `auth:reset:${String(email || '').trim().toLowerCase()}:${String(ip || 'unknown').trim().toLowerCase()}`;
}

async function readResetThrottle(env, email, ip) {
  if (!env?.RELOCATION_MANAGER_LEADS?.get) return { retryAfter: 0 };
  const raw = await env.RELOCATION_MANAGER_LEADS.get(resetThrottleKey(email, ip));
  const parsed = raw ? safeJsonParse(raw) : null;
  return { retryAfter: Number(parsed?.retryAfter || 0) };
}

async function writeResetThrottle(env, email, ip) {
  if (!env?.RELOCATION_MANAGER_LEADS?.put) return;
  await env.RELOCATION_MANAGER_LEADS.put(
    resetThrottleKey(email, ip),
    JSON.stringify({ retryAfter: Date.now() + 60 * 1000 }),
    { expirationTtl: 5 * 60 },
  );
}

async function slowDownLogin(failures = 0) {
  const delayMs = Math.min(1800, Math.max(150, failures * 250));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function clientIp(request) {
  return String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}
