import {
  cleanNumber,
  cleanString,
  authRedirectPath,
  consumeResetRecord,
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
  verifyPassword,
  subscriptionAccessDecision,
  isProfileComplete,
} from './_auth.js';

import { recordAuditEvent } from '../lib/audit.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const csrf = issueCsrfToken(request);
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
      if (!validateCsrfToken(request, body)) {
        const csrf = issueCsrfToken(request);
        return json({ ok: false, error: 'Session expired. Refresh the page and try again.', csrfToken: csrf.token }, 403, csrf.headers);
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
        return json({ ok: false, error: 'Account already exists. Sign in instead.' }, 409);
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
      if (!validateCsrfToken(request, body)) {
        const csrf = issueCsrfToken(request);
        return json({ ok: false, error: 'Session expired. Refresh the page and try again.', csrfToken: csrf.token }, 403, csrf.headers);
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
      const throttle = await readLoginThrottle(env, email, ip);
      if (throttle.lockedUntil && throttle.lockedUntil > Date.now()) {
        await slowDownLogin(throttle.failedCount);
        await recordAuditEvent(env, {
          actionType: 'account.login_locked',
          actorUserId: '',
          actorRole: '',
          targetType: 'account',
          targetId: email,
          reason: 'Login locked due to repeated failures.',
          meta: { source: 'api/account', email, ip },
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
        await recordAuditEvent(env, {
          actionType: 'account.login_failed',
          actorUserId: account?.userId || '',
          actorRole: account?.role || '',
          targetType: 'account',
          targetId: account?.userId || email,
          reason: 'Invalid login credentials.',
          meta: { source: 'api/account', email, ip, failures, lockedUntil: lockedUntil || 0 },
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
      const token = await createPasswordResetToken(env, account.userId);
      const updated = ensureAccountShape({
        ...account,
        updatedAt: new Date().toISOString(),
      }, account);
      await upsertAccount(env, updated);
      await recordAuditEvent(env, {
        actionType: 'account.password_reset_requested',
        actorUserId: updated.userId,
        actorRole: updated.role,
        targetType: 'account',
        targetId: updated.userId,
        after: { resetRequestedAt: new Date().toISOString() },
        meta: { source: 'api/account' },
      });
      return json({ ok: true, sent: true, resetUrl: `/?reset_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}#reset` });
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
      if (!validateCsrfToken(request, body)) {
        const csrf = issueCsrfToken(request);
        return json({ ok: false, error: 'Session expired. Refresh the page and try again.', csrfToken: csrf.token }, 403, csrf.headers);
      }
      const token = String(body.token || body.resetToken || '').trim();
      const password = String(body.password || '').trim();
      if (!token || !password) {
        return json({ ok: false, error: 'Reset token and new password are required.' }, 400);
      }
      const userId = await consumeResetRecord(env, token);
      if (!userId) {
        return json({ ok: false, error: 'That reset link expired or is invalid.' }, 400);
      }
      const account = await readAccountByUserId(env, userId);
      if (!account) {
        return json({ ok: false, error: 'Account not found.' }, 404);
      }
      const { salt, hash } = await hashPassword(password);
      const updated = ensureAccountShape({
        ...account,
        passwordSalt: salt,
        passwordHash: hash,
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, account);
      const saved = await upsertAccount(env, updated);
      await removeSessionsForUser(env, saved.userId);
      const response = { ok: true, profile: publicProfile(saved), memberAccess: memberAccessPayload(saved), dashboardRoute: 'signin', accessRoute: 'signin', notice: 'Password updated. Please sign in again.' };
      if (isEntitled(saved)) {
        Object.assign(response, safeAccountResponse(saved));
      }
      await recordAuditEvent(env, {
        actionType: 'account.password_reset_completed',
        actorUserId: saved.userId,
        actorRole: saved.role,
        targetType: 'account',
        targetId: saved.userId,
        after: { profile: publicProfile(saved), memberAccess: memberAccessPayload(saved) },
        meta: { source: 'api/account' },
      });
      return json(response, 200, clearSessionCookie(request));
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

    if (containsForbiddenBillingMutation(body)) {
      return json({ ok: false, error: 'Subscription and billing fields can only be updated by the server.' }, 403);
    }

    const beforeProfile = publicProfile(account);
    const next = isProfileCompletion ? mergeProfileCompletionPatch(account, body) : mergeAccountPatch(account, body);
    if (isProfileCompletion && !isProfileComplete(next)) {
      return json({ ok: false, error: 'Add your name, account type, and company to complete your profile.' }, 400);
    }
    const saved = await upsertAccount(env, next);
    const response = { ok: true, profile: publicProfile(saved), memberAccess: memberAccessPayload(saved), accessRoute: accessRoute(saved) };
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
  } catch {
    return json({ ok: false, error: 'Account save failed.' }, 500);
  }
}

function mergeProfileCompletionPatch(current, body) {
  const profile = normalizeProfile(body.profile || body);
  return ensureAccountShape({
    ...current,
    ...pickEditableProfile(profile),
    updatedAt: new Date().toISOString(),
  }, current);
}

function mergeAccountPatch(current, body) {
  const profile = normalizeProfile(body.profile || body);
  return ensureAccountShape({
    ...current,
    ...pickEditableProfile(profile),
    profileView: normalizeProfileView(body.profileView || current.profileView || 'driver'),
    communicationPrivacy: normalizeCommunicationPrivacy(body.communicationPrivacy || body.privacy || current.communicationPrivacy || {}),
    recentLoads: Array.isArray(body.recentLoads) ? body.recentLoads.slice(0, 12) : current.recentLoads || [],
    recentRequests: Array.isArray(body.recentRequests) ? body.recentRequests.slice(0, 12) : current.recentRequests || [],
    requestBids: normalizeBidMap(body.requestBids) || current.requestBids || {},
    messages: Array.isArray(body.messages) ? body.messages.slice(0, 24) : current.messages || [],
    plannedTrips: Array.isArray(body.plannedTrips) ? body.plannedTrips.slice(0, 12) : current.plannedTrips || [],
    activePickups: Array.isArray(body.activePickups) ? body.activePickups.slice(0, 20) : current.activePickups || [],
    laneAlerts: Array.isArray(body.laneAlerts) ? body.laneAlerts.slice(0, 12) : current.laneAlerts || [],
    notifications: Array.isArray(body.notifications) ? body.notifications.slice(0, 30) : current.notifications || [],
    customerRatings: Array.isArray(body.customerRatings) ? body.customerRatings.slice(0, 20) : current.customerRatings || [],
    verifiedTransactions: Array.isArray(body.verifiedTransactions) ? body.verifiedTransactions.slice(0, 60) : current.verifiedTransactions || [],
    trustDisputes: Array.isArray(body.trustDisputes) ? body.trustDisputes.slice(0, 24) : current.trustDisputes || [],
    trustAudit: Array.isArray(body.trustAudit) ? body.trustAudit.slice(0, 120) : current.trustAudit || [],
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
    preferredLanguage: cleanString(input.preferredLanguage || input.language, 8) || 'en',
    additionalLanguages: normalizeLanguageList(input.additionalLanguages || input.additional_languages || []),
    preferredTranslationLanguage: cleanString(input.preferredTranslationLanguage || input.translationLanguage || input.translation_language || input.languagePreference || input.language_preference || input.preferredLanguage || input.language, 8) || cleanString(input.preferredLanguage || input.language, 8) || 'en',
    autoTranslateMessages: normalizeBoolean(input.autoTranslateMessages ?? input.auto_translate_messages, false),
    alwaysShowOriginalMessages: normalizeBoolean(input.alwaysShowOriginalMessages ?? input.always_show_original_messages, true),
    transcribeAndTranslateVoiceNotes: normalizeBoolean(input.transcribeAndTranslateVoiceNotes ?? input.transcribe_and_translate_voice_notes, true),
    showLanguagesSpoken: normalizeBoolean(input.showLanguagesSpoken ?? input.show_languages_spoken ?? input.languageVisibility ?? input.language_visibility, false),
    role: cleanString(input.role, 80),
    note: cleanString(input.note, 280),
  };
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

function containsForbiddenBillingMutation(body = {}) {
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

  const keys = [
    ...Object.keys(body || {}),
    ...Object.keys(body?.profile || {}),
  ];
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

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
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

async function slowDownLogin(failures = 0) {
  const delayMs = Math.min(1800, Math.max(150, failures * 250));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function clientIp(request) {
  return String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}
