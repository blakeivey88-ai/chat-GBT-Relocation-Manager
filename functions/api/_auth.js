import { recordAuditEvent } from "../lib/audit.js";

const COOKIE_NAME = "rm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const REMEMBER_ME_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const CSRF_COOKIE_NAME = "rm_csrf";
const CSRF_TTL_SECONDS = 60 * 60 * 24 * 30;
const VERIFICATION_TTL_SECONDS = 60 * 60 * 24 * 3;
const RESET_TTL_SECONDS = 60 * 30;
const LEGACY_ACCOUNT_PREFIX = "account:";

function hasD1(env) {
  return Boolean(env?.RELOCATION_MANAGER_DB?.prepare);
}

export function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

export function cleanString(value, max = 120) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

export function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) return fallback;
  return [
    "1",
    "true",
    "yes",
    "y",
    "on",
    "visible",
    "public",
    "allow",
    "allowed",
  ].includes(text);
}

const LANGUAGE_LABELS = {
  en: "English",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  pa: "Punjabi",
  hi: "Hindi",
  ur: "Urdu",
  ar: "Arabic",
  zh: "Chinese",
  vi: "Vietnamese",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
  ro: "Romanian",
  tr: "Turkish",
  tl: "Tagalog",
  ht: "Kreyòl",
  auto: "Auto",
};

export function languageLabel(code = "") {
  const key = String(code || "")
    .trim()
    .toLowerCase();
  if (!key) return "";
  return LANGUAGE_LABELS[key] || String(code || "").trim();
}

export function normalizeLanguageList(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(/[,;|]/);
  return [
    ...new Set(
      list
        .map((item) => cleanString(item, 40))
        .filter(Boolean)
        .map((item) => item.toLowerCase()),
    ),
  ].slice(0, 12);
}

export function isSecureRequest(request) {
  return new URL(request.url).protocol === "https:";
}

export function getSessionToken(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function getCsrfToken(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

export function sessionCookie(request, session, options = {}) {
  const ttl = Number(
    options.maxAgeSeconds ||
      (options.rememberMe
        ? REMEMBER_ME_SESSION_TTL_SECONDS
        : SESSION_TTL_SECONDS) ||
      SESSION_TTL_SECONDS,
  );
  return {
    "set-cookie": `${COOKIE_NAME}=${encodeURIComponent(session)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag(request)}; Max-Age=${ttl}`,
  };
}

export function csrfCookie(request, token) {
  return {
    "set-cookie": `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag(request)}; Max-Age=${CSRF_TTL_SECONDS}`,
  };
}

export function issueCsrfToken(request) {
  const token = getCsrfToken(request) || generateToken(24);
  return { token, headers: csrfCookie(request, token) };
}

export function validateCsrfToken(request, body = {}) {
  const cookieToken = getCsrfToken(request);
  const headerToken = String(
    request.headers.get("x-csrf-token") ||
      request.headers.get("x-xsrf-token") ||
      body.csrfToken ||
      body.csrf_token ||
      "",
  ).trim();
  return Boolean(
    cookieToken && headerToken && constantTimeEqual(cookieToken, headerToken),
  );
}

export function clearSessionCookie(request) {
  return {
    "set-cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag(request)}; Max-Age=0`,
  };
}

export function cookieSecureFlag(request) {
  return isSecureRequest(request) ? "; Secure" : "";
}

export function userIdKey(userId) {
  return `user:${cleanString(userId, 80)}`;
}

export function emailIndexKey(email) {
  return `user:email:${normalizeEmail(email)}`;
}

export function sessionKey(session) {
  return `session:${cleanString(session, 160)}`;
}

export function stripeCustomerKey(customerId) {
  return `stripe:customer:${cleanString(customerId, 160)}`;
}

export function stripeSubscriptionKey(subscriptionId) {
  return `stripe:subscription:${cleanString(subscriptionId, 160)}`;
}

export function verificationTokenKey(token) {
  return `verification:${cleanString(token, 200)}`;
}

export function resetTokenKey(token) {
  return `reset:${cleanString(token, 200)}`;
}

export function boardKey() {
  return "bulletin:board";
}

export function isSuspendedAccount(account) {
  const status = String(
    account?.status ||
      account?.accountStatus ||
      account?.memberStatus ||
      account?.paymentStatus ||
      account?.subscriptionStatus ||
      "",
  )
    .trim()
    .toLowerCase();
  return [
    "suspended",
    "disabled",
    "blocked",
    "locked",
    "deactivated",
    "restricted",
  ].includes(status);
}

export function accountAccessLevel(account) {
  const decision = subscriptionAccessDecision(account);
  if (isSuspendedAccount(account)) return "account_suspended";
  if (!emailVerified(account)) return "email_verification_required";
  if (!decision.allowed)
    return decision.route === "billing"
      ? "payment_attention_required"
      : "subscription_required";
  return "member";
}

export function emailVerified(account) {
  return Boolean(
    String(account?.emailVerifiedAt || account?.email_verified_at || "").trim(),
  );
}

export function subscriptionStatus(account) {
  const raw = String(
    account?.subscriptionStatus || account?.paymentStatus || "",
  )
    .trim()
    .toLowerCase();
  if (!raw) return "unpaid";
  if (raw === "paid" || raw.startsWith("paid_")) return "active";
  return raw;
}

export function subscriptionPermitsAccess(
  accountOrStatus,
  maybeAccount = null,
) {
  if (typeof accountOrStatus === "string" && !maybeAccount) {
    const status = normalizeSubscriptionStatus(accountOrStatus);
    const allowedStatus = status === "active" || status === "trialing";
    return allowedStatus;
  }
  const account =
    typeof accountOrStatus === "string" ? maybeAccount : accountOrStatus;
  return subscriptionAccessDecision(accountOrStatus, maybeAccount).allowed;
}

export function accessRoute(account) {
  return subscriptionAccessDecision(account).route;
}

function safeInternalRedirectTarget(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const next = new URL(text, "https://relocationmanagerusa.invalid");
    if (next.origin !== "https://relocationmanagerusa.invalid") return "";
    if (/^\/api(\/|$)/i.test(next.pathname)) return "";
    if (/^\/admin(\.html)?(\/|$)/i.test(next.pathname)) return "";
    if (/^\/(signin|sign-in|login)(\.html)?$/i.test(next.pathname)) return "";
    if (/^\/(forgot-password|reset-password)(\.html)?$/i.test(next.pathname))
      return "";
    return `${next.pathname}${next.search}${next.hash}`;
  } catch {
    return "";
  }
}

export function authRedirectPath(account, { redirectTarget = "" } = {}) {
  const normalized = ensureAccountShape(account || {}, account || {});
  if (!normalized.userId) return "/signin";

  const dashboard = dashboardRoute(normalized);
  if (dashboard === "admin") return "/admin.html";
  if (dashboard === "verify") return "/index.html#verify";
  const safeRedirect = safeInternalRedirectTarget(redirectTarget);
  if (dashboard === "profile-completion") return "/index.html#signup";
  if (dashboard === "billing")
    return safeRedirect
      ? `/account/billing?redirect=${encodeURIComponent(safeRedirect)}`
      : "/account/billing";
  if (dashboard === "renewal")
    return safeRedirect
      ? `/account/billing?redirect=${encodeURIComponent(safeRedirect)}`
      : "/account/billing";
  if (dashboard === "plan-selection")
    return safeRedirect
      ? `/pricing?redirect=${encodeURIComponent(safeRedirect)}`
      : "/pricing";

  if (
    safeRedirect &&
    !safeRedirect.startsWith("/pricing") &&
    !safeRedirect.startsWith("/account/billing")
  ) {
    return safeRedirect;
  }

  return "/index.html#profile";
}

export function dashboardRoute(account) {
  const normalized = ensureAccountShape(account || {}, account || {});
  if (!normalized.userId) return "signin";
  if (isSuspendedAccount(normalized)) return "signin";
  if (!emailVerified(normalized)) return "verify";
  if (!isProfileComplete(normalized)) return "profile-completion";
  if (isAdminAccount(normalized)) return "admin";
  const role = normalizeRole(normalized.role || roleFromType(normalized.type));
  if (role === "Moving Company") return "moving";
  if (role === "Customer / Shipper") return "customer";
  if (role === "Service Provider") return "provider";
  if (role === "Broker") return "broker";
  if (
    role === "Owner-Operator" ||
    role === "Truck Driver" ||
    role === "Trucking Company"
  )
    return "driver";
  const status = subscriptionStatus(normalized);
  if (status === "past_due")
    return normalized.subscriptionGraceUntil &&
      parseTimeMs(normalized.subscriptionGraceUntil) > Date.now()
      ? "billing"
      : "renewal";
  if (status === "canceled" || status === "expired") return "renewal";
  if (
    status === "unpaid" ||
    status === "unpaid_waitlist" ||
    status === "incomplete" ||
    status === "incomplete_expired"
  )
    return "plan-selection";
  return "profile";
}

export function isProfileComplete(account) {
  if (!account) return false;
  const name = cleanString(account.name, 120);
  const type = cleanString(account.type, 120);
  const company = cleanString(account.company, 160);
  if (!name || !type) return false;
  const role = normalizeRole(account.role || roleFromType(type));
  if (["Administrator"].includes(role)) return true;
  if (
    role === "Service Provider" ||
    role === "Broker" ||
    role === "Trucking Company" ||
    role === "Customer / Shipper" ||
    role === "Moving Company"
  ) {
    return Boolean(company);
  }
  return true;
}

export function subscriptionAccessDecision(
  accountOrStatus,
  maybeAccount = null,
) {
  const account =
    typeof accountOrStatus === "string" ? maybeAccount : accountOrStatus;
  const status = normalizeSubscriptionStatus(
    typeof accountOrStatus === "string"
      ? accountOrStatus
      : subscriptionStatus(account),
  );
  const currentPeriodEndMs = parseTimeMs(
    account?.subscriptionCurrentPeriodEnd ||
      account?.currentPeriodEnd ||
      account?.current_period_end,
  );
  const graceUntilMs = parseTimeMs(
    account?.subscriptionGraceUntil ||
      account?.subscriptionGraceUntilAt ||
      account?.graceUntilAt,
  );
  const trialAllowed = Boolean(
    account?.trialAllowed ||
    account?.subscriptionTrialAllowed ||
    account?.trialConfigured ||
    account?.intentionalTrial ||
    String(account?.subscriptionTrialMode || "").toLowerCase() === "enabled",
  );
  const now = Date.now();
  const activeLike =
    status === "active" || (status === "trialing" && trialAllowed);
  const withinPaidPeriod = !currentPeriodEndMs || currentPeriodEndMs > now;
  if (!account || !account.userId) {
    return { allowed: false, route: "signin", reason: "Not signed in." };
  }
  if (isAdminAccount(account)) {
    return {
      allowed: true,
      route: "",
      reason: "",
      status: "active",
      admin: true,
    };
  }
  if (
    String(
      account?.status || account?.accountStatus || account?.memberStatus || "",
    )
      .trim()
      .toLowerCase() === "restricted" ||
    status === "restricted"
  ) {
    return {
      allowed: false,
      route: "signin",
      reason: "This account is restricted.",
      status: "restricted",
    };
  }
  if (isSuspendedAccount(account)) {
    return {
      allowed: false,
      route: "signin",
      reason: "This account is suspended.",
    };
  }
  if (!emailVerified(account)) {
    return {
      allowed: false,
      route: "verify",
      reason: "Verify your email before accessing member features.",
    };
  }
  if (activeLike && withinPaidPeriod) {
    return { allowed: true, route: "", reason: "", status };
  }
  if (activeLike && !withinPaidPeriod) {
    return {
      allowed: false,
      route: graceUntilMs > now ? "billing" : "renewal",
      reason: "Your subscription has expired.",
      status,
      graceUntilMs: graceUntilMs || 0,
    };
  }
  if (status === "past_due") {
    return {
      allowed: false,
      route: graceUntilMs > now ? "billing" : "renewal",
      reason: "Your payment is past due.",
      status,
      billingAttention: true,
      graceUntilMs: graceUntilMs || 0,
    };
  }
  if (status === "canceled" || status === "expired") {
    return {
      allowed: false,
      route: "renewal",
      reason: "Your subscription was canceled.",
    };
  }
  if (
    status === "unpaid" ||
    status === "unpaid_waitlist" ||
    status === "incomplete_expired"
  ) {
    return {
      allowed: false,
      route: "plan-selection",
      reason: "Subscription required.",
    };
  }
  if (status === "incomplete" || status === "paused") {
    return {
      allowed: false,
      route: "billing",
      reason: "Payment requires attention.",
    };
  }
  return {
    allowed: false,
    route: "plan-selection",
    reason: "Subscription required.",
  };
}

export function hasIdentity(account) {
  return Boolean(cleanString(account?.userId || account?.email || "", 120));
}

export function loadAccessFromType(type = "", paymentStatus = "") {
  const typeText = String(type || "").toLowerCase();
  const paymentText = String(paymentStatus || "").toLowerCase();
  if (
    /customer|shipper|pickup/.test(typeText) ||
    paymentText === "paid_shipper"
  )
    return "request_post";
  if (
    /driver|owner[- ]?operator|broker|fleet|carrier|company|motor carrier/.test(
      typeText,
    ) ||
    paymentText === "paid_driver" ||
    paymentText.startsWith("paid_fleet_")
  )
    return "claim_post";
  return "claim";
}

const CARRIER_BOOKING_MINIMUM_CENTS = 2999;

const CARRIER_ROLE_PATTERNS = [
  /\bcarrier\b/i,
  /\bbroker\b/i,
  /\bfleet\b/i,
  /\btrucking company\b/i,
  /\bmotor carrier\b/i,
  /\btruck driver\b/i,
  /\bdriver\b/i,
  /\bowner[- ]?operator\b/i,
  /\bhot ?shot\b/i,
  /\bbox truck\b/i,
  /\bflatbed\b/i,
  /\bstep deck\b/i,
  /\blow?boy\b/i,
  /\brgn\b/i,
  /\bconestoga\b/i,
  /\bpower[- ]?only\b/i,
  /\bcar hauler\b/i,
  /\bcar carrier\b/i,
  /\btanker\b/i,
  /\bdump truck\b/i,
];

const CARRIER_VERIFICATION_PATTERNS = [
  /\bverified\b/i,
  /\bapproved\b/i,
  /\bcomplete\b/i,
  /\bcompleted\b/i,
  /\bdone\b/i,
  /\bpassed\b/i,
  /\bactive\b/i,
  /\bcarrier verification\b/i,
  /\bauthority verified\b/i,
  /\binsurance verified\b/i,
  /\bdot\/mc verified\b/i,
  /\bverified carrier\b/i,
  /\bapproved carrier\b/i,
  /\bcarrier approved\b/i,
  /\bverified hauling\b/i,
  /\bverified authority\b/i,
];

const CARRIER_PRICE_HINTS = [
  [999, /\$?9\.99|paid_shipper|shipper/i],
  [2999, /\$?29\.99|paid_driver|independent driver|owner[- ]?operator/i],
  [5999, /\$?59\.99|paid_fleet_starter|fleet starter|1[-–]3 trucks/i],
  [7999, /\$?79\.99|paid_fleet_growth|fleet growth|4[-–]7 trucks/i],
  [14999, /\$?149\.99|paid_fleet_pro|fleet pro|7[-–]12 trucks/i],
];

function moneyToCents(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  if (/^\d+\.\d{1,2}$/.test(text)) return Math.round(Number(text) * 100);
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (Number.isInteger(n) && n < 100) return Math.round(n * 100);
  return Math.round(n);
}

export function carrierBookingPriceCents(account) {
  const directValues = [
    account?.subscriptionPriceCents,
    account?.billingAmountCents,
    account?.planAmountCents,
    account?.priceCents,
    account?.stripePriceAmountCents,
    account?.stripePriceUnitAmount,
  ];
  for (const value of directValues) {
    const cents = moneyToCents(value);
    if (cents >= 100) return cents;
  }

  const texts = [
    account?.paymentStatus,
    account?.subscriptionStatus,
    account?.planLabel,
    account?.type,
    account?.checkoutPlan,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  const priceMatch = texts.match(/\$\s*(\d{1,4})(?:\.(\d{1,2}))?/);
  if (priceMatch) {
    return (
      Number(priceMatch[1]) * 100 +
      Number((priceMatch[2] || "00").padEnd(2, "0"))
    );
  }

  for (const [cents, pattern] of CARRIER_PRICE_HINTS) {
    if (pattern.test(texts)) return cents;
  }

  return 0;
}

export function carrierRoleLabel(account) {
  const explicit = normalizeRole(
    account?.role || roleFromType(account?.type || ""),
  );
  if (explicit && explicit !== "Truck Driver") return explicit;
  const text = String(account?.role || account?.type || "").toLowerCase();
  if (/owner[- ]?operator/.test(text)) return "Owner-Operator";
  if (/trucking company|motor carrier|carrier/.test(text))
    return "Trucking Company";
  if (/hot ?shot/.test(text)) return "Hot Shot Operator";
  if (/box truck/.test(text)) return "Box Truck Carrier";
  if (/flatbed/.test(text)) return "Flatbed Carrier";
  if (/step deck/.test(text)) return "Step Deck Carrier";
  if (/lowboy|rgn/.test(text)) return "Lowboy Operator";
  if (/conestoga/.test(text)) return "Conestoga Carrier";
  if (/power[- ]?only/.test(text)) return "Power Only Operator";
  if (/car carrier|auto transport/.test(text)) return "Car Hauler";
  if (/tanker/.test(text)) return "Tanker Operator";
  if (/dump truck/.test(text)) return "Dump Truck Operator";
  if (/driver/.test(text)) return "Truck Driver";
  return explicit || "Carrier";
}

export function carrierRolePermitted(account) {
  const text = String(account?.role || account?.type || "").toLowerCase();
  const paymentText = String(
    account?.paymentStatus || account?.subscriptionStatus || "",
  ).toLowerCase();
  return (
    paymentText === "paid_driver" ||
    paymentText.startsWith("paid_fleet_") ||
    CARRIER_ROLE_PATTERNS.some((pattern) => pattern.test(text))
  );
}

function verificationLooksComplete(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /verified|approved|complete|completed|done|passed|active/i.test(text);
}

export function carrierVerificationDecision(account) {
  const completedAt = [
    account?.carrierVerifiedAt,
    account?.verifiedCarrierAt,
    account?.carrierVerificationCompletedAt,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const explicit = [
    account?.carrierVerificationStatus,
    account?.carrierVerification,
    account?.carrierApprovalStatus,
    account?.carrierVerificationResult,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  if (completedAt.length) {
    return {
      allowed: true,
      verified: true,
      status: "verified",
      reason: "",
      route: "",
    };
  }

  const authority = [
    account?.authorityVerification,
    account?.authorityStatus,
    account?.dotMcStatus,
    account?.dotMcLookup,
  ].some((value) => verificationLooksComplete(value));
  const insurance = [
    account?.insuranceVerification,
    account?.insuranceStatus,
    account?.insuranceUpload,
    account?.insuranceVerified,
  ].some((value) => verificationLooksComplete(value));
  const identity = [
    account?.idCheckStatus,
    account?.idCheck,
    account?.driverIdStatus,
    account?.driverIdVerification,
  ].some((value) => verificationLooksComplete(value));

  if (CARRIER_VERIFICATION_PATTERNS.some((pattern) => pattern.test(explicit))) {
    return {
      allowed: true,
      verified: true,
      status: "verified",
      reason: "",
      route: "",
    };
  }

  if (authority && insurance && identity) {
    return {
      allowed: true,
      verified: true,
      status: "verified",
      reason: "",
      route: "",
    };
  }

  const missing = [];
  if (!authority) missing.push("authority/DOT-MC");
  if (!insurance) missing.push("insurance");
  if (!identity) missing.push("identity");
  return {
    allowed: false,
    verified: false,
    status: "pending",
    reason: `Complete carrier verification: ${missing.join(", ")}.`,
    route: "carrier-verification",
    missing,
  };
}

export function carrierLoadBookingDecision(account) {
  const decision = subscriptionAccessDecision(account);
  const roleAllowed = carrierRolePermitted(account);
  const priceCents = carrierBookingPriceCents(account);
  const verification = carrierVerificationDecision(account);
  const profileComplete = isProfileComplete(account);
  const accountStatus = String(
    account?.status ||
      account?.accountStatus ||
      account?.memberStatus ||
      account?.paymentStatus ||
      account?.subscriptionStatus ||
      "",
  )
    .trim()
    .toLowerCase();

  if (!account || !account.userId) {
    return {
      allowed: false,
      route: "signin",
      reason: "Not signed in.",
      message: "Sign in to continue.",
    };
  }

  if (isAdminAccount(account)) {
    return {
      allowed: true,
      route: "",
      reason: "",
      message: "",
      roleAllowed: true,
      verified: true,
      priceCents,
    };
  }

  if (accountStatus === "restricted") {
    return {
      allowed: false,
      route: "profile",
      reason: "Account restricted.",
      message:
        "This account is restricted. Contact support or an admin to restore access.",
      roleAllowed,
      verified: verification.verified,
      priceCents,
    };
  }

  if (!roleAllowed) {
    return {
      allowed: false,
      route: "profile",
      reason: "Carrier role required.",
      message:
        "Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription. Please upgrade or complete your carrier verification.",
      roleAllowed: false,
      verified: verification.verified,
      priceCents,
    };
  }

  if (!profileComplete) {
    return {
      allowed: false,
      route: "profile-completion",
      reason: "Complete your profile.",
      message:
        "Complete your profile details before accepting or picking up loads.",
      roleAllowed: true,
      verified: verification.verified,
      priceCents,
      subscriptionStatus: subscriptionStatus(account),
    };
  }

  if (!decision.allowed) {
    const route =
      decision.route === "billing" || decision.route === "renewal"
        ? "billing"
        : "pricing";
    return {
      allowed: false,
      route,
      reason: decision.reason || "Subscription required.",
      message:
        decision.route === "billing"
          ? "Your subscription needs attention before load booking is available. Update billing to restore access."
          : "Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription. Please upgrade or complete your carrier verification.",
      roleAllowed: true,
      verified: verification.verified,
      priceCents,
      subscriptionStatus: subscriptionStatus(account),
    };
  }

  if (priceCents < CARRIER_BOOKING_MINIMUM_CENTS) {
    return {
      allowed: false,
      route: "pricing",
      reason: "Upgrade required.",
      message:
        "Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription. Please upgrade or complete your carrier verification.",
      roleAllowed: true,
      verified: verification.verified,
      priceCents,
      subscriptionStatus: subscriptionStatus(account),
    };
  }

  if (!verification.allowed) {
    return {
      allowed: false,
      route: verification.route || "carrier-verification",
      reason: verification.reason,
      message:
        "Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription. Please upgrade or complete your carrier verification.",
      roleAllowed: true,
      verified: false,
      priceCents,
      subscriptionStatus: subscriptionStatus(account),
      missing: verification.missing || [],
    };
  }

  return {
    allowed: true,
    route: "",
    reason: "",
    message: "",
    roleAllowed: true,
    verified: true,
    priceCents,
    subscriptionStatus: subscriptionStatus(account),
  };
}

export function carrierLoadBookingPayload(account) {
  const decision = carrierLoadBookingDecision(account);
  return {
    allowed: decision.allowed,
    message: decision.allowed ? "" : decision.message,
    reason: decision.reason || "",
    route: decision.route || "",
    roleAllowed: Boolean(decision.roleAllowed),
    verified: Boolean(decision.verified),
    priceCents: decision.priceCents || 0,
    subscriptionStatus:
      decision.subscriptionStatus || subscriptionStatus(account),
    minimumPriceCents: CARRIER_BOOKING_MINIMUM_CENTS,
  };
}

export function normalizeRole(input = "") {
  const text = String(input || "").toLowerCase();
  if (/admin/.test(text)) return "Administrator";
  if (/moving\s*company|mover|moving service|moving crew/.test(text))
    return "Moving Company";
  if (
    /service[- ]?provider|parking|tow|towing|repair|mechanic|warehouse|insurance|fuel|hotel/.test(
      text,
    )
  )
    return "Service Provider";
  if (/customer|shipper|pickup/.test(text)) return "Customer / Shipper";
  if (/broker/.test(text)) return "Broker";
  if (/owner[- ]?operator|self[- ]?insured|independent driver/.test(text))
    return "Owner-Operator";
  if (/trucking company|motor carrier|carrier|company|fleet/.test(text))
    return "Trucking Company";
  if (/truck driver|driver/.test(text)) return "Truck Driver";
  return "Truck Driver";
}

export function roleFromType(type = "") {
  return normalizeRole(type);
}

export function workspaceFromType(type = "") {
  if (/customer|shipper|pickup/i.test(type)) return "customer";
  if (/broker/i.test(type)) return "broker";
  if (/moving\s*company|mover|moving service|moving crew/i.test(type))
    return "moving";
  if (
    /service[- ]?provider|parking|tow|towing|repair|mechanic|warehouse|insurance|fuel|hotel/i.test(
      type,
    )
  )
    return "provider";
  return "driver";
}

export function truckCountFromType(type = "") {
  const text = String(type || "").toLowerCase();
  if (/1[-–]3/.test(text)) return 3;
  if (/4[-–]7/.test(text)) return 7;
  if (/7[-–]12/.test(text)) return 12;
  return 0;
}

export function paymentTags(paymentInfo) {
  const tags = ["paid-member"];
  const label = String(paymentInfo.planLabel || "").toLowerCase();
  const type = String(paymentInfo.type || "").toLowerCase();

  if (/shipper/.test(label) || /customer/.test(type)) {
    tags.push("basic-plan", "shippers-plan");
  } else if (/independent driver/.test(label) || /driver/.test(type)) {
    tags.push("professional-plan", "independent-driver");
  } else {
    tags.push("premium-plan");
  }

  if (/fleet starter/.test(label)) tags.push("fleet-starter");
  if (/fleet growth/.test(label)) tags.push("fleet-growth");
  if (/fleet pro/.test(label)) tags.push("fleet-pro");

  return dedupeTags(tags);
}

export function dedupeTags(tags) {
  return [
    ...new Set(
      (tags || [])
        .filter(Boolean)
        .map((tag) => String(tag).trim().toLowerCase().replace(/\s+/g, "-")),
    ),
  ];
}

export function makeUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function makeAccessCode() {
  return `RM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = base64UrlEncode(saltBytes);
  const hash = await pbkdf2Hash(password, salt);
  return { salt, hash };
}

export async function verifyPassword(password, salt, hash) {
  const next = await pbkdf2Hash(password, salt);
  return constantTimeEqual(next, String(hash || ""));
}

export async function pbkdf2Hash(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password || "")),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(String(salt || "")),
      iterations: 210000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return base64UrlEncode(new Uint8Array(derived));
}

export function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecode(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  return new Uint8Array(Array.from(binary, (char) => char.charCodeAt(0)));
}

export function generateToken(size = 24) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function tokenHash(token) {
  return sha256Hex(String(token || ""));
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value || "")),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function constantTimeEqualHash(value, expected) {
  return constantTimeEqual(await sha256Hex(value), String(expected || ""));
}

export function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function randomId(prefix = "") {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
}

const ACCOUNT_DB_COLUMNS = [
  "user_id",
  "email",
  "name",
  "company",
  "username",
  "type",
  "role",
  "phone",
  "mc_dot",
  "city",
  "state",
  "equipment_type",
  "preferred_language",
  "additional_languages",
  "preferred_translation_language",
  "auto_translate_messages",
  "always_show_original_messages",
  "transcribe_and_translate_voice_notes",
  "show_languages_spoken",
  "verification",
  "note",
  "password_salt",
  "password_hash",
  "email_verified_at",
  "email_verification_sent_at",
  "payment_status",
  "subscription_status",
  "subscription_access",
  "paid_at",
  "plan_label",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_session_id",
  "stripe_last_event_created_at",
  "stripe_last_event_id",
  "stripe_last_event_type",
  "subscription_current_period_end",
  "subscription_grace_until",
  "subscription_canceled_at",
  "subscription_cancel_at_period_end",
  "subscription_trial_allowed",
  "truck_count",
  "load_access",
  "tags",
  "recent_loads",
  "recent_requests",
  "request_bids",
  "messages",
  "planned_trips",
  "active_pickups",
  "lane_alerts",
  "customer_ratings",
  "trust_disputes",
  "trust_audit",
  "notifications",
  "notification_preferences",
  "communication_privacy",
  "equipment_types",
  "avatar_url",
  "logo_url",
  "checkout_plan",
  "profile_view",
  "access_code",
  "access_code_hint",
  "created_at",
  "updated_at",
];

const ACCOUNT_DB_UPSERT_COLUMNS = ACCOUNT_DB_COLUMNS.filter(
  (column) => column !== "user_id",
);

function safeDbJson(value, fallback) {
  const next = value === undefined || value === null ? fallback : value;
  return JSON.stringify(next ?? fallback);
}

function dbBoolean(value) {
  return value ? 1 : 0;
}

function rowToAccount(row) {
  if (!row) return null;
  return ensureAccountShape(
    {
      userId: row.user_id,
      email: row.email,
      name: row.name,
      company: row.company,
      username: row.username,
      type: row.type,
      role: row.role,
      phone: row.phone,
      mc_dot: row.mc_dot,
      city: row.city,
      state: row.state,
      equipmentType: row.equipment_type,
      preferredLanguage: row.preferred_language,
      additionalLanguages: safeJsonParse(row.additional_languages) || [],
      preferredTranslationLanguage: row.preferred_translation_language,
      autoTranslateMessages: Boolean(row.auto_translate_messages),
      alwaysShowOriginalMessages: Boolean(row.always_show_original_messages),
      transcribeAndTranslateVoiceNotes: Boolean(
        row.transcribe_and_translate_voice_notes,
      ),
      showLanguagesSpoken: Boolean(row.show_languages_spoken),
      verification: row.verification,
      note: row.note,
      passwordSalt: row.password_salt,
      passwordHash: row.password_hash,
      emailVerifiedAt: row.email_verified_at,
      emailVerificationSentAt: row.email_verification_sent_at,
      paymentStatus: row.payment_status,
      subscriptionStatus: row.subscription_status,
      subscriptionAccess: row.subscription_access,
      paidAt: row.paid_at,
      planLabel: row.plan_label,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeSessionId: row.stripe_session_id,
      stripeLastEventCreatedAt: row.stripe_last_event_created_at,
      stripeLastEventId: row.stripe_last_event_id,
      stripeLastEventType: row.stripe_last_event_type,
      subscriptionCurrentPeriodEnd: row.subscription_current_period_end,
      subscriptionGraceUntil: row.subscription_grace_until,
      subscriptionCanceledAt: row.subscription_canceled_at,
      subscriptionCancelAtPeriodEnd: Boolean(
        row.subscription_cancel_at_period_end,
      ),
      subscriptionTrialAllowed: Boolean(row.subscription_trial_allowed),
      truckCount: row.truck_count,
      loadAccess: row.load_access,
      tags: safeJsonParse(row.tags) || [],
      recentLoads: safeJsonParse(row.recent_loads) || [],
      recentRequests: safeJsonParse(row.recent_requests) || [],
      requestBids: safeJsonParse(row.request_bids) || {},
      messages: safeJsonParse(row.messages) || [],
      plannedTrips: safeJsonParse(row.planned_trips) || [],
      activePickups: safeJsonParse(row.active_pickups) || [],
      laneAlerts: safeJsonParse(row.lane_alerts) || [],
      customerRatings: safeJsonParse(row.customer_ratings) || [],
      trustDisputes: safeJsonParse(row.trust_disputes) || [],
      trustAudit: safeJsonParse(row.trust_audit) || [],
      notifications: safeJsonParse(row.notifications) || [],
      notificationPreferences:
        safeJsonParse(row.notification_preferences) || {},
      communicationPrivacy: safeJsonParse(row.communication_privacy) || {},
      equipmentTypes: safeJsonParse(row.equipment_types) || [],
      avatarUrl: row.avatar_url,
      logoUrl: row.logo_url,
      checkoutPlan: row.checkout_plan,
      profileView: row.profile_view,
      accessCode: row.access_code,
      accessCodeHint: row.access_code_hint,
      passwordChangedAt: row.password_changed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    row,
  );
}

function accountToDbRow(account) {
  const next = ensureAccountShape(account, account);
  return {
    user_id: next.userId,
    email: next.email,
    name: next.name,
    company: next.company,
    username: next.username,
    type: next.type,
    role: next.role,
    phone: next.phone,
    mc_dot: next.mc_dot,
    city: next.city,
    state: next.state,
    equipment_type: next.equipmentType,
    preferred_language: next.preferredLanguage || "en",
    additional_languages: safeDbJson(next.additionalLanguages, []),
    preferred_translation_language:
      next.preferredTranslationLanguage || next.preferredLanguage || "en",
    auto_translate_messages: dbBoolean(next.autoTranslateMessages),
    always_show_original_messages: dbBoolean(next.alwaysShowOriginalMessages),
    transcribe_and_translate_voice_notes: dbBoolean(
      next.transcribeAndTranslateVoiceNotes,
    ),
    show_languages_spoken: dbBoolean(next.showLanguagesSpoken),
    verification: next.verification,
    note: next.note,
    password_salt: next.passwordSalt,
    password_hash: next.passwordHash,
    email_verified_at: next.emailVerifiedAt,
    email_verification_sent_at: next.emailVerificationSentAt,
    payment_status: next.paymentStatus,
    subscription_status: next.subscriptionStatus,
    subscription_access: next.subscriptionAccess,
    paid_at: next.paidAt,
    plan_label: next.planLabel,
    stripe_customer_id: next.stripeCustomerId,
    stripe_subscription_id: next.stripeSubscriptionId,
    stripe_session_id: next.stripeSessionId,
    stripe_last_event_created_at: next.stripeLastEventCreatedAt,
    stripe_last_event_id: next.stripeLastEventId,
    stripe_last_event_type: next.stripeLastEventType,
    subscription_current_period_end: next.subscriptionCurrentPeriodEnd,
    subscription_grace_until: next.subscriptionGraceUntil,
    subscription_canceled_at: next.subscriptionCanceledAt,
    subscription_cancel_at_period_end: dbBoolean(
      next.subscriptionCancelAtPeriodEnd,
    ),
    subscription_trial_allowed: dbBoolean(next.subscriptionTrialAllowed),
    truck_count: next.truckCount,
    load_access: next.loadAccess,
    tags: safeDbJson(next.tags, []),
    recent_loads: safeDbJson(next.recentLoads, []),
    recent_requests: safeDbJson(next.recentRequests, []),
    request_bids: safeDbJson(next.requestBids, {}),
    messages: safeDbJson(next.messages, []),
    planned_trips: safeDbJson(next.plannedTrips, []),
    active_pickups: safeDbJson(next.activePickups, []),
    lane_alerts: safeDbJson(next.laneAlerts, []),
    customer_ratings: safeDbJson(next.customerRatings, []),
    trust_disputes: safeDbJson(next.trustDisputes, []),
    trust_audit: safeDbJson(next.trustAudit, []),
    notifications: safeDbJson(next.notifications, []),
    notification_preferences: safeDbJson(next.notificationPreferences, {}),
    communication_privacy: safeDbJson(next.communicationPrivacy, {}),
    equipment_types: safeDbJson(next.equipmentTypes, []),
    avatar_url: next.avatarUrl,
    logo_url: next.logoUrl,
    checkout_plan: next.checkoutPlan || "",
    profile_view: next.profileView,
    access_code: next.accessCode,
    access_code_hint: next.accessCodeHint,
    password_changed_at: next.passwordChangedAt,
    created_at: next.createdAt,
    updated_at: next.updatedAt,
  };
}

function accountDbParams(account) {
  const row = accountToDbRow(account);
  return ACCOUNT_DB_COLUMNS.map((column) => row[column]);
}

export async function readSessionRecord(env, session) {
  if (hasD1(env)) {
    try {
      const result = await env.RELOCATION_MANAGER_DB.prepare(
        "SELECT * FROM sessions WHERE session_id = ? LIMIT 1",
      )
        .bind(cleanString(session, 160))
        .first();
      if (result) {
        return {
          session: result.session_id,
          userId: result.user_id,
          email: result.email,
          createdAt: result.created_at,
          lastSeenAt: result.last_seen_at,
          expiresAt: result.expires_at,
        };
      }
    } catch {
      // Fall back to KV below.
    }
  }

  const raw = await env.RELOCATION_MANAGER_LEADS.get(sessionKey(session));
  return raw ? safeJsonParse(raw) : null;
}

export async function createSession(env, userId, extra = {}, options = {}) {
  const session = generateToken(24);
  const now = new Date().toISOString();
  const ttlSeconds = Number(
    options.maxAgeSeconds ||
      (options.rememberMe
        ? REMEMBER_ME_SESSION_TTL_SECONDS
        : SESSION_TTL_SECONDS) ||
      SESSION_TTL_SECONDS,
  );
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const record = {
    session,
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    rememberMe: Boolean(options.rememberMe || extra.rememberMe),
    ...extra,
  };
  if (hasD1(env)) {
    try {
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO sessions (
          session_id,
          user_id,
          email,
          created_at,
          last_seen_at,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          session,
          userId,
          cleanString(extra.email || "", 120),
          now,
          now,
          expiresAt,
        )
        .run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.put(
    sessionKey(session),
    JSON.stringify(record),
    {
      expirationTtl: ttlSeconds,
    },
  );
  return session;
}

export async function readAccountByUserId(env, userId) {
  const normalizedUserId = cleanString(userId, 80);
  if (hasD1(env) && normalizedUserId) {
    try {
      const row = await env.RELOCATION_MANAGER_DB.prepare(
        "SELECT * FROM accounts WHERE user_id = ? LIMIT 1",
      )
        .bind(normalizedUserId)
        .first();
      if (row) return await hydrateAccountFromD1(env, rowToAccount(row));
    } catch {
      // Fall back to KV below.
    }
  }

  const raw = await env.RELOCATION_MANAGER_LEADS.get(
    userIdKey(normalizedUserId),
  );
  return raw ? safeJsonParse(raw) : null;
}

export async function readAccountByEmail(env, email) {
  const normalized = normalizeEmail(email);
  if (hasD1(env) && normalized) {
    try {
      const row = await env.RELOCATION_MANAGER_DB.prepare(
        "SELECT * FROM accounts WHERE email = ? LIMIT 1",
      )
        .bind(normalized)
        .first();
      if (row) return await hydrateAccountFromD1(env, rowToAccount(row));
    } catch {
      // Fall back to KV below.
    }
  }

  const userId = await env.RELOCATION_MANAGER_LEADS.get(
    emailIndexKey(normalized),
  );
  if (userId) {
    const account = await readAccountByUserId(env, userId);
    if (account) return account;
  }

  const legacyKey = `${LEGACY_ACCOUNT_PREFIX}${normalized}`;
  const raw = await env.RELOCATION_MANAGER_LEADS.get(legacyKey);
  if (!raw) return null;
  const legacy = safeJsonParse(raw);
  if (!legacy) return null;
  const upgraded = ensureAccountShape(legacy, {
    email: normalized,
    userId: legacy.userId || makeUserId(),
  });
  await upsertAccount(env, upgraded);
  return upgraded;
}

export async function upsertAccount(env, account) {
  const next = ensureAccountShape(account, account);
  if (hasD1(env) && next.email) {
    try {
      const columns = ACCOUNT_DB_COLUMNS.join(", ");
      const placeholders = ACCOUNT_DB_COLUMNS.map(() => "?").join(", ");
      const updates = ACCOUNT_DB_UPSERT_COLUMNS.map(
        (column) => `${column} = excluded.${column}`,
      ).join(", ");
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO accounts (${columns}) VALUES (${placeholders}) ON CONFLICT(user_id) DO UPDATE SET ${updates}`,
      )
        .bind(...accountDbParams(next))
        .run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.put(
    userIdKey(next.userId),
    JSON.stringify(next),
  );
  if (next.email) {
    await env.RELOCATION_MANAGER_LEADS.put(
      emailIndexKey(next.email),
      next.userId,
    );
  }
  if (next.stripeCustomerId) {
    await linkStripeCustomer(env, next.stripeCustomerId, next.userId);
  }
  if (next.stripeSubscriptionId) {
    await linkStripeSubscription(env, next.stripeSubscriptionId, next.userId);
  }
  try {
    await syncAccountHistoryTables(env, next);
  } catch {
    // History sync is best-effort during the D1 cutover.
  }
  return next;
}

export async function linkStripeCustomer(env, customerId, userId) {
  if (!customerId || !userId) return;
  const key = stripeCustomerKey(customerId);
  const existing = await env.RELOCATION_MANAGER_LEADS.get(key);
  if (existing && existing !== userId) return false;
  await env.RELOCATION_MANAGER_LEADS.put(key, userId);
  return true;
}

export async function linkStripeSubscription(env, subscriptionId, userId) {
  if (!subscriptionId || !userId) return;
  const key = stripeSubscriptionKey(subscriptionId);
  const existing = await env.RELOCATION_MANAGER_LEADS.get(key);
  if (existing && existing !== userId) return false;
  await env.RELOCATION_MANAGER_LEADS.put(key, userId);
  return true;
}

export async function resolveUserIdFromStripe(env, session) {
  const customerId = cleanString(
    session?.customer || session?.customer_id || "",
    160,
  );
  const subscriptionId = cleanString(
    session?.subscription || session?.subscription_id || "",
    160,
  );

  if (hasD1(env)) {
    try {
      if (customerId) {
        const byCustomer = await env.RELOCATION_MANAGER_DB.prepare(
          "SELECT user_id FROM accounts WHERE stripe_customer_id = ? LIMIT 1",
        )
          .bind(customerId)
          .first();
        if (byCustomer?.user_id) return byCustomer.user_id;
      }

      if (subscriptionId) {
        const bySubscription = await env.RELOCATION_MANAGER_DB.prepare(
          "SELECT user_id FROM accounts WHERE stripe_subscription_id = ? LIMIT 1",
        )
          .bind(subscriptionId)
          .first();
        if (bySubscription?.user_id) return bySubscription.user_id;
      }

      const email = normalizeEmail(
        session?.customer_details?.email ||
          session?.customer_email ||
          session?.metadata?.email ||
          session?.metadata?.customer_email ||
          session?.client_reference_id,
      );
      if (email) {
        const byEmail = await env.RELOCATION_MANAGER_DB.prepare(
          "SELECT user_id FROM accounts WHERE email = ? LIMIT 1",
        )
          .bind(email)
          .first();
        if (byEmail?.user_id) return byEmail.user_id;
      }
    } catch {
      // Fall back to KV below.
    }
  }

  if (customerId) {
    const byCustomer = await env.RELOCATION_MANAGER_LEADS.get(
      stripeCustomerKey(customerId),
    );
    if (byCustomer) return byCustomer;
  }

  if (subscriptionId) {
    const bySubscription = await env.RELOCATION_MANAGER_LEADS.get(
      stripeSubscriptionKey(subscriptionId),
    );
    if (bySubscription) return bySubscription;
  }

  const email = normalizeEmail(
    session?.customer_details?.email ||
      session?.customer_email ||
      session?.metadata?.email ||
      session?.metadata?.customer_email ||
      session?.client_reference_id,
  );
  if (!email) return "";

  return (await env.RELOCATION_MANAGER_LEADS.get(emailIndexKey(email))) || "";
}

export async function createVerificationRecord(env, userId, token) {
  const hash = tokenHash(token);
  if (hasD1(env)) {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + VERIFICATION_TTL_SECONDS * 1000,
      ).toISOString();
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO email_verification_tokens (
          verification_token_hash,
          user_id,
          created_at,
          expires_at
        ) VALUES (?, ?, ?, ?)`,
      )
        .bind(hash, userId, now, expiresAt)
        .run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.put(verificationTokenKey(hash), userId, {
    expirationTtl: VERIFICATION_TTL_SECONDS,
  });
  return hash;
}

export async function consumeVerificationRecord(env, token) {
  const hash = tokenHash(token);
  if (hasD1(env)) {
    try {
      const record = await env.RELOCATION_MANAGER_DB.prepare(
        "SELECT user_id FROM email_verification_tokens WHERE verification_token_hash = ? LIMIT 1",
      )
        .bind(hash)
        .first();
      if (record?.user_id) {
        await env.RELOCATION_MANAGER_DB.prepare(
          "DELETE FROM email_verification_tokens WHERE verification_token_hash = ?",
        )
          .bind(hash)
          .run();
        return record.user_id;
      }
    } catch {
      // Fall back to KV below.
    }
  }
  const userId = await env.RELOCATION_MANAGER_LEADS.get(
    verificationTokenKey(hash),
  );
  if (userId) {
    await env.RELOCATION_MANAGER_LEADS.delete(verificationTokenKey(hash));
  }
  return userId || "";
}

export async function createResetRecord(env, userId, token) {
  const hash = tokenHash(token);
  if (hasD1(env)) {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + RESET_TTL_SECONDS * 1000,
      ).toISOString();
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO password_reset_tokens (
          reset_token_hash,
          user_id,
          created_at,
          expires_at
        ) VALUES (?, ?, ?, ?)`,
      )
        .bind(hash, userId, now, expiresAt)
        .run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.put(resetTokenKey(hash), userId, {
    expirationTtl: RESET_TTL_SECONDS,
  });
  return hash;
}

export async function consumeResetRecord(env, token) {
  const hash = tokenHash(token);
  if (hasD1(env)) {
    try {
      const record = await env.RELOCATION_MANAGER_DB.prepare(
        "SELECT user_id FROM password_reset_tokens WHERE reset_token_hash = ? LIMIT 1",
      )
        .bind(hash)
        .first();
      if (record?.user_id) {
        await env.RELOCATION_MANAGER_DB.prepare(
          "DELETE FROM password_reset_tokens WHERE reset_token_hash = ?",
        )
          .bind(hash)
          .run();
        return record.user_id;
      }
    } catch {
      // Fall back to KV below.
    }
  }
  const userId = await env.RELOCATION_MANAGER_LEADS.get(resetTokenKey(hash));
  if (userId) {
    await env.RELOCATION_MANAGER_LEADS.delete(resetTokenKey(hash));
  }
  return userId || "";
}

export async function removeSession(env, session) {
  if (!session) return;
  if (hasD1(env)) {
    try {
      await env.RELOCATION_MANAGER_DB.prepare(
        "DELETE FROM sessions WHERE session_id = ?",
      )
        .bind(cleanString(session, 160))
        .run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.delete(sessionKey(session));
}

export async function removeSessionsForUser(env, userId) {
  const normalizedUserId = cleanString(userId, 80);
  if (!normalizedUserId) return;
  if (hasD1(env)) {
    try {
      await env.RELOCATION_MANAGER_DB.prepare(
        "DELETE FROM sessions WHERE user_id = ?",
      )
        .bind(normalizedUserId)
        .run();
    } catch {
      // Fall back to KV below.
    }
  }
  try {
    let cursor;
    do {
      const page = await env.RELOCATION_MANAGER_LEADS.list({
        prefix: "session:",
        cursor,
        limit: 1000,
      });
      cursor = page?.cursor;
      const keys = Array.isArray(page?.keys) ? page.keys : [];
      for (const entry of keys) {
        const key = String(entry?.name || "");
        const raw = await env.RELOCATION_MANAGER_LEADS.get(key);
        if (!raw) continue;
        const session = safeJsonParse(raw);
        if (String(session?.userId || "") === normalizedUserId) {
          await env.RELOCATION_MANAGER_LEADS.delete(key);
        }
      }
    } while (cursor);
  } catch {
    // Best-effort KV cleanup only.
  }
}

export async function readCurrentAccount(request, env) {
  const session = getSessionToken(request);
  if (!session) return { session: null, account: null };
  const record = await readSessionRecord(env, session);
  if (!record?.userId) return { session, account: null };
  if (
    record.expiresAt &&
    Date.parse(record.expiresAt) > 0 &&
    Date.parse(record.expiresAt) <= Date.now()
  ) {
    await removeSession(env, session);
    return { session: null, account: null };
  }
  const account = await readAccountByUserId(env, record.userId);
  if (!account) return { session, account: null };
  if (isSuspendedAccount(account)) {
    await removeSession(env, session);
    return { session: null, account: null };
  }
  const passwordChangedAt = Date.parse(
    account.passwordChangedAt || account.password_changed_at || "",
  );
  const sessionCreatedAt = Date.parse(
    record.createdAt || record.created_at || "",
  );
  if (
    passwordChangedAt &&
    sessionCreatedAt &&
    sessionCreatedAt < passwordChangedAt
  ) {
    await removeSession(env, session);
    return { session: null, account: null };
  }
  return { session, account };
}

export async function listLeaderboardAccounts(env) {
  if (hasD1(env)) {
    try {
      const result = await env.RELOCATION_MANAGER_DB.prepare(
        `SELECT * FROM accounts
         WHERE email_verified_at <> ''
           AND (subscription_status IN ('active', 'trialing') OR payment_status LIKE 'paid%')
         ORDER BY updated_at DESC, user_id DESC`,
      ).all();
      return Array.isArray(result?.results)
        ? result.results.map(rowToAccount).filter(Boolean)
        : [];
    } catch {
      // Fall back to KV below.
    }
  }

  const accounts = [];
  let cursor;
  do {
    const page = await env.RELOCATION_MANAGER_LEADS.list({
      prefix: "user:",
      cursor,
      limit: 1000,
    });
    cursor = page?.cursor;
    const keys = Array.isArray(page?.keys) ? page.keys : [];
    for (const entry of keys) {
      const name = String(entry?.name || "");
      if (!/^user:[^:]/.test(name) || name.startsWith("user:email:")) continue;
      const userId = name.slice(5);
      if (!userId) continue;
      const raw = await readAccountByUserId(env, userId);
      if (!raw) continue;
      const account = ensureAccountShape(raw);
      if (!emailVerified(account) || !isEntitled(account)) continue;
      accounts.push(account);
    }
  } while (cursor);
  return accounts;
}

export function normalizePlanFromPayment(paymentInfo = {}) {
  const text = String(
    paymentInfo.planLabel || paymentInfo.type || "",
  ).toLowerCase();
  if (/shipper|pickup/.test(text)) return "request";
  if (/broker|fleet/.test(text)) return "claim_post";
  return "claim";
}

export function publicProfile(account) {
  if (!account) return null;
  const primaryLanguage = account.preferredLanguage || "en";
  const additionalLanguages = Array.isArray(account.additionalLanguages)
    ? account.additionalLanguages
    : [];
  const preferredTranslationLanguage =
    account.preferredTranslationLanguage || primaryLanguage;
  const showLanguagesSpoken = normalizeBoolean(
    account.showLanguagesSpoken ||
      account.languageVisibility ||
      account.communicationPrivacy?.languagesVisible,
    false,
  );
  const languagesSpoken = [
    ...new Set(
      [primaryLanguage, ...additionalLanguages]
        .map((item) =>
          String(item || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
  const languageLabels = languagesSpoken
    .map((code) => languageLabel(code))
    .filter(Boolean);
  return {
    userId: account.userId || "",
    name: account.name || "Guest",
    company: account.company || "",
    email: account.email || "",
    username: account.username || account.userId || "",
    type: account.type || "Independent driver / self-insured - $29.99/mo",
    phone: account.phone || "",
    mc_dot: account.mc_dot || "",
    role: normalizeRole(account.role || roleFromType(account.type)),
    city: account.city || "",
    state: account.state || "",
    equipmentType: account.equipmentType || "",
    equipmentTypes: Array.isArray(account.equipmentTypes)
      ? account.equipmentTypes
      : [],
    avatarUrl: account.avatarUrl || "",
    logoUrl: account.logoUrl || "",
    preferredLanguage: account.preferredLanguage || "en",
    additionalLanguages: additionalLanguages,
    preferredTranslationLanguage,
    autoTranslateMessages: normalizeBoolean(
      account.autoTranslateMessages,
      false,
    ),
    alwaysShowOriginalMessages: normalizeBoolean(
      account.alwaysShowOriginalMessages,
      true,
    ),
    transcribeAndTranslateVoiceNotes: normalizeBoolean(
      account.transcribeAndTranslateVoiceNotes,
      true,
    ),
    showLanguagesSpoken,
    languagesSpoken: showLanguagesSpoken ? languagesSpoken : [],
    languagesSpokenLabel: showLanguagesSpoken
      ? languageLabels.join(" and ")
      : "",
    verification: account.verification || "Not verified",
    note: account.note || "",
    subscriptionStatus: subscriptionStatus(account),
    paymentStatus: account.paymentStatus || legacyPaymentStatus(account),
    paidAt: account.paidAt || "",
    planLabel: account.planLabel || "",
    emailVerifiedAt: account.emailVerifiedAt || "",
    emailVerificationSentAt: account.emailVerificationSentAt || "",
    subscriptionAccess:
      account.subscriptionAccess ||
      loadAccessFromType(account.type, account.paymentStatus),
    subscriptionCurrentPeriodEnd: account.subscriptionCurrentPeriodEnd || "",
    subscriptionGraceUntil: account.subscriptionGraceUntil || "",
    subscriptionCancelAtPeriodEnd: Boolean(
      account.subscriptionCancelAtPeriodEnd,
    ),
    subscriptionTrialAllowed: Boolean(
      account.subscriptionTrialAllowed ||
      account.trialAllowed ||
      account.trialConfigured ||
      account.intentionalTrial,
    ),
    truckCount: account.truckCount || truckCountFromType(account.type),
    loadAccess:
      account.loadAccess ||
      loadAccessFromType(account.type, account.paymentStatus),
    tags: Array.isArray(account.tags) ? account.tags : [],
    paymentMethod: account.paymentMethod || "",
    communicationPrivacy: normalizeCommunicationPrivacy(
      account.communicationPrivacy || {},
    ),
  };
}

export function safeAccountResponse(account) {
  const profile = publicProfile(account);
  const carrierLoadBookingAccess = carrierLoadBookingPayload(account);
  return {
    profile,
    tags: Array.isArray(account?.tags) ? account.tags : [],
    verifiedTransactions: Array.isArray(account?.verifiedTransactions)
      ? account.verifiedTransactions
      : [],
    recentLoads: Array.isArray(account?.recentLoads) ? account.recentLoads : [],
    recentRequests: Array.isArray(account?.recentRequests)
      ? account.recentRequests
      : [],
    requestBids: account?.requestBids || {},
    messages: Array.isArray(account?.messages) ? account.messages : [],
    plannedTrips: Array.isArray(account?.plannedTrips)
      ? account.plannedTrips
      : [],
    activePickups: Array.isArray(account?.activePickups)
      ? account.activePickups
      : [],
    laneAlerts: Array.isArray(account?.laneAlerts) ? account.laneAlerts : [],
    customerRatings: Array.isArray(account?.customerRatings)
      ? account.customerRatings
      : [],
    trustDisputes: Array.isArray(account?.trustDisputes)
      ? account.trustDisputes
      : [],
    trustAudit: Array.isArray(account?.trustAudit) ? account.trustAudit : [],
    notifications: Array.isArray(account?.notifications)
      ? account.notifications
      : [],
    notificationPreferences: account?.notificationPreferences || {},
    checkoutPlan: account?.checkoutPlan || null,
    profileView: account?.profileView || "driver",
    loadAccess:
      account?.loadAccess ||
      loadAccessFromType(account?.type, account?.paymentStatus),
    paymentStatus: account?.paymentStatus || legacyPaymentStatus(account),
    accessCodeHint: account?.accessCodeHint || null,
    communicationPrivacy: normalizeCommunicationPrivacy(
      account?.communicationPrivacy || {},
    ),
    subscriptionStatus: subscriptionStatus(account),
    emailVerified: emailVerified(account),
    entitled: isEntitled(account),
    carrierLoadBookingAccess,
    accessRoute: accessRoute(account),
    dashboardRoute: dashboardRoute(account),
    billingAttention: subscriptionStatus(account) === "past_due",
    profileComplete: isProfileComplete(account),
  };
}

export function isEntitled(account) {
  return subscriptionAccessDecision(account).allowed;
}

export function isAdminAccount(account) {
  if (!account) return false;
  const role = normalizeRole(account.role || roleFromType(account.type || ""));
  const typeText = String(account.type || "").toLowerCase();
  const tags = Array.isArray(account.tags) ? account.tags : [];
  return (
    role === "Administrator" ||
    /admin/.test(typeText) ||
    tags.some((tag) => String(tag || "").toLowerCase() === "admin")
  );
}

export function legacyPaymentStatus(account) {
  const status = subscriptionStatus(account);
  if (status === "active" || status === "trialing") return "paid";
  return "unpaid_waitlist";
}

export function ensureAccountShape(input, fallback = {}) {
  const current = input || {};
  const email = normalizeEmail(current.email || fallback.email || "");
  const userId = cleanString(
    current.userId || fallback.userId || makeUserId(),
    80,
  );
  const subscriptionStatusValue = subscriptionStatus(current);
  const paymentStatus = current.paymentStatus || legacyPaymentStatus(current);
  const loadAccess =
    current.loadAccess ||
    loadAccessFromType(current.type || fallback.type, paymentStatus);
  const typeWorkspace = workspaceFromType(current.type || fallback.type);
  const profileView = normalizeProfileView(
    current.profileView || fallback.profileView || typeWorkspace,
  );

  return {
    userId,
    email,
    name: cleanString(
      current.name || fallback.name || email.split("@")[0] || "Guest",
      120,
    ),
    company: cleanString(current.company || fallback.company || "", 160),
    username: cleanString(
      current.username ||
        fallback.username ||
        cleanString(
          (current.name || fallback.name || email.split("@")[0] || "Guest")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "."),
          40,
        ) ||
        userId,
      40,
    ),
    type: cleanString(
      current.type ||
        fallback.type ||
        "Independent driver / self-insured - $29.99/mo",
      120,
    ),
    phone: cleanString(current.phone || fallback.phone || "", 40),
    mc_dot: cleanString(current.mc_dot || fallback.mc_dot || "", 80),
    role: normalizeRole(
      current.role ||
        fallback.role ||
        roleFromType(current.type || fallback.type),
    ),
    preferredLanguage:
      cleanString(
        current.preferredLanguage || fallback.preferredLanguage || "en",
        8,
      ) || "en",
    additionalLanguages: normalizeLanguageList(
      current.additionalLanguages || fallback.additionalLanguages || [],
    ),
    preferredTranslationLanguage:
      cleanString(
        current.preferredTranslationLanguage ||
          fallback.preferredTranslationLanguage ||
          current.preferredLanguage ||
          fallback.preferredLanguage ||
          "en",
        8,
      ) || "en",
    autoTranslateMessages: normalizeBoolean(
      current.autoTranslateMessages ?? fallback.autoTranslateMessages,
      false,
    ),
    alwaysShowOriginalMessages: normalizeBoolean(
      current.alwaysShowOriginalMessages ?? fallback.alwaysShowOriginalMessages,
      true,
    ),
    transcribeAndTranslateVoiceNotes: normalizeBoolean(
      current.transcribeAndTranslateVoiceNotes ??
        fallback.transcribeAndTranslateVoiceNotes,
      true,
    ),
    showLanguagesSpoken: normalizeBoolean(
      current.showLanguagesSpoken ??
        fallback.showLanguagesSpoken ??
        current.languageVisibility ??
        fallback.languageVisibility ??
        current.communicationPrivacy?.languagesVisible ??
        fallback.communicationPrivacy?.languagesVisible,
      false,
    ),
    verification: cleanString(
      current.verification || fallback.verification || "Not verified",
      80,
    ),
    note: cleanString(current.note || fallback.note || "", 280),
    passwordHash: cleanString(
      current.passwordHash || fallback.passwordHash || "",
      160,
    ),
    passwordSalt: cleanString(
      current.passwordSalt || fallback.passwordSalt || "",
      80,
    ),
    emailVerifiedAt: cleanString(
      current.emailVerifiedAt || fallback.emailVerifiedAt || "",
      80,
    ),
    emailVerificationSentAt: cleanString(
      current.emailVerificationSentAt || fallback.emailVerificationSentAt || "",
      80,
    ),
    emailVerificationTokenHash: cleanString(
      current.emailVerificationTokenHash ||
        fallback.emailVerificationTokenHash ||
        "",
      160,
    ),
    emailVerificationExpiresAt: cleanString(
      current.emailVerificationExpiresAt ||
        fallback.emailVerificationExpiresAt ||
        "",
      80,
    ),
    resetTokenHash: cleanString(
      current.resetTokenHash || fallback.resetTokenHash || "",
      160,
    ),
    resetTokenExpiresAt: cleanString(
      current.resetTokenExpiresAt || fallback.resetTokenExpiresAt || "",
      80,
    ),
    paymentStatus,
    subscriptionStatus: subscriptionStatusValue,
    subscriptionAccess:
      current.subscriptionAccess || fallback.subscriptionAccess || loadAccess,
    paidAt: cleanString(current.paidAt || fallback.paidAt || "", 80),
    planLabel: cleanString(current.planLabel || fallback.planLabel || "", 80),
    stripeCustomerId: cleanString(
      current.stripeCustomerId || fallback.stripeCustomerId || "",
      120,
    ),
    stripeSubscriptionId: cleanString(
      current.stripeSubscriptionId || fallback.stripeSubscriptionId || "",
      120,
    ),
    stripeSessionId: cleanString(
      current.stripeSessionId || fallback.stripeSessionId || "",
      120,
    ),
    stripeLastEventCreatedAt: cleanString(
      current.stripeLastEventCreatedAt ||
        fallback.stripeLastEventCreatedAt ||
        "",
      80,
    ),
    stripeLastEventId: cleanString(
      current.stripeLastEventId || fallback.stripeLastEventId || "",
      120,
    ),
    stripeLastEventType: cleanString(
      current.stripeLastEventType || fallback.stripeLastEventType || "",
      80,
    ),
    subscriptionCurrentPeriodEnd: cleanString(
      current.subscriptionCurrentPeriodEnd ||
        fallback.subscriptionCurrentPeriodEnd ||
        "",
      80,
    ),
    subscriptionGraceUntil: cleanString(
      current.subscriptionGraceUntil || fallback.subscriptionGraceUntil || "",
      80,
    ),
    subscriptionCanceledAt: cleanString(
      current.subscriptionCanceledAt || fallback.subscriptionCanceledAt || "",
      80,
    ),
    subscriptionCancelAtPeriodEnd: Boolean(
      current.subscriptionCancelAtPeriodEnd ||
      fallback.subscriptionCancelAtPeriodEnd ||
      false,
    ),
    subscriptionTrialAllowed: Boolean(
      current.subscriptionTrialAllowed ||
      fallback.subscriptionTrialAllowed ||
      current.trialAllowed ||
      fallback.trialAllowed ||
      current.trialConfigured ||
      fallback.trialConfigured ||
      current.intentionalTrial ||
      fallback.intentionalTrial ||
      false,
    ),
    truckCount:
      cleanNumber(current.truckCount || fallback.truckCount) ||
      truckCountFromType(current.type || fallback.type),
    loadAccess,
    tags: Array.isArray(current.tags)
      ? current.tags.map((tag) => cleanString(tag, 50))
      : Array.isArray(fallback.tags)
        ? fallback.tags.map((tag) => cleanString(tag, 50))
        : [],
    verifiedTransactions: Array.isArray(current.verifiedTransactions)
      ? current.verifiedTransactions
      : Array.isArray(fallback.verifiedTransactions)
        ? fallback.verifiedTransactions
        : [],
    recentLoads: Array.isArray(current.recentLoads)
      ? current.recentLoads
      : Array.isArray(fallback.recentLoads)
        ? fallback.recentLoads
        : [],
    recentRequests: Array.isArray(current.recentRequests)
      ? current.recentRequests
      : Array.isArray(fallback.recentRequests)
        ? fallback.recentRequests
        : [],
    requestBids:
      current.requestBids && typeof current.requestBids === "object"
        ? current.requestBids
        : fallback.requestBids && typeof fallback.requestBids === "object"
          ? fallback.requestBids
          : {},
    messages: Array.isArray(current.messages)
      ? current.messages
      : Array.isArray(fallback.messages)
        ? fallback.messages
        : [],
    plannedTrips: Array.isArray(current.plannedTrips)
      ? current.plannedTrips
      : Array.isArray(fallback.plannedTrips)
        ? fallback.plannedTrips
        : [],
    activePickups: Array.isArray(current.activePickups)
      ? current.activePickups
      : Array.isArray(fallback.activePickups)
        ? fallback.activePickups
        : [],
    laneAlerts: Array.isArray(current.laneAlerts)
      ? current.laneAlerts
      : Array.isArray(fallback.laneAlerts)
        ? fallback.laneAlerts
        : [],
    customerRatings: Array.isArray(current.customerRatings)
      ? current.customerRatings
      : Array.isArray(fallback.customerRatings)
        ? fallback.customerRatings
        : [],
    trustDisputes: Array.isArray(current.trustDisputes)
      ? current.trustDisputes
      : Array.isArray(fallback.trustDisputes)
        ? fallback.trustDisputes
        : [],
    trustAudit: Array.isArray(current.trustAudit)
      ? current.trustAudit
      : Array.isArray(fallback.trustAudit)
        ? fallback.trustAudit
        : [],
    communicationPrivacy: normalizeCommunicationPrivacy(
      current.communicationPrivacy || fallback.communicationPrivacy || {},
    ),
    notificationPreferences:
      current.notificationPreferences &&
      typeof current.notificationPreferences === "object"
        ? current.notificationPreferences
        : fallback.notificationPreferences &&
            typeof fallback.notificationPreferences === "object"
          ? fallback.notificationPreferences
          : {},
    city: cleanString(current.city || fallback.city || "", 80),
    state: cleanString(current.state || fallback.state || "", 40),
    equipmentType: cleanString(
      current.equipmentType || fallback.equipmentType || "",
      120,
    ),
    equipmentTypes: Array.isArray(current.equipmentTypes)
      ? current.equipmentTypes.slice(0, 12)
      : Array.isArray(fallback.equipmentTypes)
        ? fallback.equipmentTypes.slice(0, 12)
        : [],
    avatarUrl: cleanString(current.avatarUrl || fallback.avatarUrl || "", 280),
    logoUrl: cleanString(current.logoUrl || fallback.logoUrl || "", 280),
    notifications: Array.isArray(current.notifications)
      ? current.notifications.slice(0, 30)
      : Array.isArray(fallback.notifications)
        ? fallback.notifications.slice(0, 30)
        : [],
    checkoutPlan:
      cleanString(current.checkoutPlan || fallback.checkoutPlan || "", 80) ||
      null,
    profileView:
      profileView === "driver" && typeWorkspace !== "driver"
        ? typeWorkspace
        : profileView,
    accessCode: cleanString(
      current.accessCode || fallback.accessCode || "",
      80,
    ),
    accessCodeHint: cleanString(
      current.accessCodeHint || fallback.accessCodeHint || "",
      80,
    ),
    createdAt: cleanString(
      current.createdAt || fallback.createdAt || new Date().toISOString(),
      80,
    ),
    updatedAt: cleanString(
      current.updatedAt || fallback.updatedAt || new Date().toISOString(),
      80,
    ),
  };
}

async function hydrateAccountFromD1(env, account) {
  if (!hasD1(env) || !account?.userId) return account;
  const next = ensureAccountShape(account, account);
  if (
    Array.isArray(next.verifiedTransactions) &&
    next.verifiedTransactions.length
  )
    return next;
  const verifiedTransactions = await readVerifiedTransactions(env, next.userId);
  return ensureAccountShape({ ...next, verifiedTransactions }, next);
}

async function readVerifiedTransactions(env, userId) {
  if (!hasD1(env)) return [];
  const normalizedUserId = cleanString(userId, 80);
  if (!normalizedUserId) return [];
  try {
    const result = await env.RELOCATION_MANAGER_DB.prepare(
      `SELECT * FROM verified_transactions
       WHERE user_id = ?
       ORDER BY completed_at DESC, created_at DESC, verified_transaction_id DESC`,
    )
      .bind(normalizedUserId)
      .all();
    return Array.isArray(result?.results)
      ? result.results
          .map((row) => verifiedTransactionRowToEntry(row))
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function verifiedTransactionRowToEntry(row) {
  if (!row) return null;
  const payload = safeJsonParse(row.payload_json) || {};
  return {
    ...payload,
    id: row.verified_transaction_id,
    loadId: row.load_id,
    reviewTargetType:
      row.review_target_type ||
      payload.reviewTargetType ||
      payload.reviewType ||
      "shipper",
    title: row.title || payload.title || "",
    origin: row.origin || payload.origin || "",
    destination: row.destination || payload.destination || "",
    equipment: row.equipment || payload.equipment || "",
    detail: row.detail || payload.detail || "",
    verified: Boolean(row.verified),
    completedAt: row.completed_at || payload.completedAt || "",
    reviewerUserId: row.reviewer_user_id || payload.reviewerUserId || "",
    reviewerName: row.reviewer_name || payload.reviewerName || "",
    createdAt: row.created_at || payload.createdAt || "",
    updatedAt: row.updated_at || payload.updatedAt || "",
  };
}

async function syncAccountHistoryTables(env, account) {
  if (!hasD1(env) || !account?.userId) return;
  await syncVerifiedTransactions(env, account);
  await syncCustomerRatings(env, account);
  await syncTrustDisputes(env, account);
  await syncTrustAudit(env, account);
}

async function syncVerifiedTransactions(env, account) {
  const records = Array.isArray(account.verifiedTransactions)
    ? account.verifiedTransactions
    : [];
  if (!records.length) return;
  const now = new Date().toISOString();
  for (const entry of records) {
    const verifiedTransactionId = cleanString(
      entry?.id ||
        entry?.reviewTransactionId ||
        entry?.reviewTransactionKey ||
        `${account.userId}:${entry?.completedAt || now}:${entry?.title || entry?.detail || "verified-transaction"}`,
      120,
    );
    const payload = {
      ...entry,
      id: verifiedTransactionId,
    };
    const completedAt =
      cleanString(entry?.completedAt || entry?.createdAt || now, 80) || now;
    await env.RELOCATION_MANAGER_DB.prepare(
      `INSERT INTO verified_transactions (
        verified_transaction_id,
        user_id,
        load_id,
        review_target_type,
        title,
        origin,
        destination,
        equipment,
        detail,
        verified,
        completed_at,
        reviewer_user_id,
        reviewer_name,
        payload_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(verified_transaction_id) DO UPDATE SET
        user_id = excluded.user_id,
        load_id = excluded.load_id,
        review_target_type = excluded.review_target_type,
        title = excluded.title,
        origin = excluded.origin,
        destination = excluded.destination,
        equipment = excluded.equipment,
        detail = excluded.detail,
        verified = excluded.verified,
        completed_at = excluded.completed_at,
        reviewer_user_id = excluded.reviewer_user_id,
        reviewer_name = excluded.reviewer_name,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at`,
    )
      .bind(
        verifiedTransactionId,
        account.userId,
        cleanString(entry?.loadId || entry?.load_id || "", 120),
        cleanString(
          entry?.reviewTargetType ||
            entry?.reviewMode ||
            entry?.reviewType ||
            "shipper",
          40,
        ),
        cleanString(entry?.title || "", 160),
        cleanString(entry?.origin || "", 80),
        cleanString(entry?.destination || "", 80),
        cleanString(entry?.equipment || "", 120),
        cleanString(entry?.detail || "", 400),
        normalizeBoolean(entry?.verified ?? true, true) ? 1 : 0,
        completedAt,
        cleanString(entry?.reviewerUserId || account.userId, 80),
        cleanString(entry?.reviewerName || account.name || "", 120),
        JSON.stringify(payload),
        cleanString(entry?.createdAt || completedAt || now, 80),
        now,
      )
      .run();
  }
}

async function syncCustomerRatings(env, account) {
  const ratings = Array.isArray(account.customerRatings)
    ? account.customerRatings
    : [];
  if (!ratings.length) return;
  for (const entry of ratings) {
    const reviewId = cleanString(
      entry?.id ||
        entry?.reviewTransactionId ||
        `${account.userId}:${entry?.createdAt || new Date().toISOString()}:${entry?.name || "review"}`,
      120,
    );
    const reviewerUserId = cleanString(
      entry?.reviewerUserId || account.userId,
      80,
    );
    const reviewedUserId = cleanString(
      entry?.reviewedUserId ||
        entry?.targetUserId ||
        entry?.targetId ||
        account.userId,
      80,
    );
    const createdAt = cleanString(
      entry?.createdAt || new Date().toISOString(),
      80,
    );
    await env.RELOCATION_MANAGER_DB.prepare(
      `INSERT INTO reviews (
        review_id,
        reviewer_user_id,
        reviewed_user_id,
        load_id,
        review_type,
        score,
        notes,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(review_id) DO UPDATE SET
        reviewer_user_id = excluded.reviewer_user_id,
        reviewed_user_id = excluded.reviewed_user_id,
        load_id = excluded.load_id,
        review_type = excluded.review_type,
        score = excluded.score,
        notes = excluded.notes,
        status = excluded.status,
        updated_at = excluded.updated_at`,
    )
      .bind(
        reviewId,
        reviewerUserId,
        reviewedUserId,
        cleanString(entry?.reviewTransactionId || entry?.loadId || "", 120),
        cleanString(entry?.reviewMode || entry?.kind || "review", 40),
        cleanNumber(entry?.score || entry?.publicScore || 0),
        cleanString(entry?.notes || entry?.reviewQuestionSummary || "", 400),
        cleanString(entry?.disputeStatus || "approved", 24),
        createdAt,
        createdAt,
      )
      .run();

    await env.RELOCATION_MANAGER_DB.prepare(
      "DELETE FROM review_answers WHERE review_id = ?",
    )
      .bind(reviewId)
      .run();
    const answers = Array.isArray(entry?.reviewQuestionValues)
      ? entry.reviewQuestionValues
      : [];
    for (const answer of answers) {
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO review_answers (
          review_answer_id,
          review_id,
          question_key,
          answer_value,
          answer_label,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          cleanString(
            answer?.id ||
              `${reviewId}:${answer?.key || answer?.label || "answer"}`,
            120,
          ),
          reviewId,
          cleanString(answer?.key || answer?.label || "", 80),
          cleanString(String(answer?.value ?? ""), 40),
          cleanString(answer?.valueLabel || "", 120),
          createdAt,
        )
        .run();
    }
  }
}

async function syncTrustDisputes(env, account) {
  const disputes = Array.isArray(account.trustDisputes)
    ? account.trustDisputes
    : [];
  if (!disputes.length) return;
  for (const entry of disputes) {
    const disputeId = cleanString(
      entry?.id ||
        `${account.userId}:${entry?.createdAt || new Date().toISOString()}:${entry?.reviewId || entry?.reviewLabel || "dispute"}`,
      120,
    );
    const createdAt = cleanString(
      entry?.createdAt || new Date().toISOString(),
      80,
    );
    await env.RELOCATION_MANAGER_DB.prepare(
      `INSERT INTO disputes (
        dispute_id,
        review_id,
        load_id,
        user_id,
        reason,
        status,
        notes,
        created_at,
        resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dispute_id) DO UPDATE SET
        review_id = excluded.review_id,
        load_id = excluded.load_id,
        user_id = excluded.user_id,
        reason = excluded.reason,
        status = excluded.status,
        notes = excluded.notes,
        resolved_at = excluded.resolved_at`,
    )
      .bind(
        disputeId,
        cleanString(entry?.reviewId || entry?.reviewTransactionId || "", 120),
        cleanString(entry?.loadId || "", 120),
        account.userId,
        cleanString(entry?.reason || "", 240),
        cleanString(entry?.status || "open", 24),
        cleanString(entry?.notes || "", 400),
        createdAt,
        cleanString(entry?.resolvedAt || "", 80),
      )
      .run();

    await env.RELOCATION_MANAGER_DB.prepare(
      "DELETE FROM dispute_evidence WHERE dispute_id = ?",
    )
      .bind(disputeId)
      .run();
    const evidence = Array.isArray(entry?.evidence) ? entry.evidence : [];
    for (const item of evidence) {
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO dispute_evidence (
          dispute_evidence_id,
          dispute_id,
          evidence_type,
          file_ref,
          notes,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          cleanString(`${disputeId}:${item}`, 120),
          disputeId,
          "text",
          "",
          cleanString(item, 240),
          createdAt,
        )
        .run();
    }
  }
}

async function syncTrustAudit(env, account) {
  const entries = Array.isArray(account.trustAudit) ? account.trustAudit : [];
  if (!entries.length) return;
  for (const entry of entries) {
    const auditId = cleanString(
      entry?.id ||
        `${account.userId}:${entry?.createdAt || new Date().toISOString()}:${entry?.reason || "trust-audit"}`,
      120,
    );
    try {
      await recordAuditEvent(env, {
        auditId,
        verifiedEventRef: auditId,
        actorUserId: cleanString(entry?.userId || account.userId, 80),
        actorRole: account.role || "",
        actionType: "trust.score_adjustment",
        targetType: "account",
        targetId: account.userId,
        before: { score: Number(entry?.before || 0) },
        after: { score: Number(entry?.after || 0) },
        reason: cleanString(entry?.reason || "", 240),
        meta: {
          delta: Number(entry?.delta || 0),
          name: cleanString(entry?.name || account.name || "", 120),
          fraudSignals: Array.isArray(entry?.fraudSignals)
            ? entry.fraudSignals
            : [],
          source: "api/account",
        },
        createdAt: cleanString(
          entry?.createdAt || new Date().toISOString(),
          80,
        ),
      });
    } catch {
      // Duplicate audit rows are expected during repeated syncs.
    }
  }
}

export function normalizeProfileView(view) {
  if (
    view === "customer" ||
    view === "shipper" ||
    view === "broker" ||
    view === "driver" ||
    view === "provider" ||
    view === "moving"
  )
    return view === "shipper" ? "customer" : view;
  return "driver";
}

export function normalizeCommunicationPrivacy(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const truthy = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    const text = String(value || "")
      .trim()
      .toLowerCase();
    if (!text) return fallback;
    return [
      "1",
      "true",
      "yes",
      "y",
      "on",
      "visible",
      "public",
      "allow",
      "allowed",
    ].includes(text);
  };
  return {
    emailVisible: truthy(
      source.emailVisible ?? source.showEmail ?? source.allowEmail,
      false,
    ),
    phoneVisible: truthy(
      source.phoneVisible ?? source.showPhone ?? source.allowPhone,
      false,
    ),
    directMessages: truthy(
      source.directMessages ?? source.allowDirectMessages,
      true,
    ),
    loadMessages: truthy(source.loadMessages ?? source.allowLoadMessages, true),
    companyMessages: truthy(
      source.companyMessages ?? source.allowCompanyMessages,
      true,
    ),
    channelMessages: truthy(
      source.channelMessages ?? source.allowChannelMessages,
      true,
    ),
    mentions: truthy(source.mentions ?? source.allowMentions, true),
    notifications: {
      inApp: truthy(
        source.notifications?.inApp ??
          source.inAppNotifications ??
          source.allowInAppNotifications,
        true,
      ),
      push: truthy(
        source.notifications?.push ??
          source.pushNotifications ??
          source.allowPushNotifications,
        true,
      ),
      email: truthy(
        source.notifications?.email ??
          source.emailNotifications ??
          source.allowEmailNotifications,
        false,
      ),
      sms: truthy(
        source.notifications?.sms ??
          source.smsNotifications ??
          source.allowSmsNotifications,
        false,
      ),
    },
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeProfileViewLegacy(view) {
  return normalizeProfileView(view);
}

export function normalizeSubscriptionStatus(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "unpaid";
  if (raw === "paid" || raw.startsWith("paid_")) return "active";
  if (
    raw === "active" ||
    raw === "trialing" ||
    raw === "past_due" ||
    raw === "canceled" ||
    raw === "expired" ||
    raw === "paused" ||
    raw === "unpaid" ||
    raw === "incomplete" ||
    raw === "incomplete_expired"
  )
    return raw;
  return raw;
}

function parseTimeMs(value) {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function normalizePaidStatusFromPlan(paymentInfo = {}) {
  const paymentStatus = String(paymentInfo.paymentStatus || "").trim();
  if (paymentStatus.startsWith("paid")) return paymentStatus;
  return paymentInfo.planLabel ? "paid" : "unpaid_waitlist";
}

export async function createEmailVerificationToken(env, userId) {
  const token = generateToken(24);
  await createVerificationRecord(env, userId, token);
  return token;
}

export async function createPasswordResetToken(env, userId) {
  const token = generateToken(24);
  await createResetRecord(env, userId, token);
  return token;
}

export async function requireSessionAccount(request, env) {
  const session = getSessionToken(request);
  if (!session) return { ok: false, status: 401, error: "Not signed in." };
  const record = await readSessionRecord(env, session);
  if (!record?.userId)
    return { ok: false, status: 401, error: "Not signed in." };
  const account = await readAccountByUserId(env, record.userId);
  if (!account) return { ok: false, status: 404, error: "Account not found." };
  if (isSuspendedAccount(account))
    return { ok: false, status: 403, error: "This account is suspended." };
  return { ok: true, session, account, record };
}

export async function requireEntitledAccount(
  request,
  env,
  { requireVerifiedEmail = true, requireCompleteProfile = true } = {},
) {
  const result = await requireSessionAccount(request, env);
  if (!result.ok) return result;
  if (requireVerifiedEmail && !emailVerified(result.account)) {
    return {
      ok: false,
      status: 403,
      error: "Verify your email before accessing member features.",
    };
  }
  if (requireCompleteProfile && !isProfileComplete(result.account)) {
    return {
      ok: false,
      status: 403,
      error: "Complete your profile before accessing member features.",
      reason: "Complete your profile.",
      route: "profile-completion",
    };
  }
  const decision = subscriptionAccessDecision(result.account);
  if (!decision.allowed) {
    return {
      ok: false,
      status: 403,
      error:
        decision.route === "billing"
          ? "Update your payment method to access member features."
          : "Complete your monthly subscription to access member features.",
      reason: decision.reason,
      route: decision.route,
    };
  }
  return result;
}

export async function requireRoleAccount(request, env, allowedRoles = []) {
  const result = await requireSessionAccount(request, env);
  if (!result.ok) return result;
  const normalized = normalizeRole(
    result.account?.role || roleFromType(result.account?.type),
  );
  const allowed = new Set(
    (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
      .filter(Boolean)
      .map((role) => normalizeRole(role)),
  );
  if (!allowed.size || allowed.has("*") || allowed.has(normalized))
    return result;
  return {
    ok: false,
    status: 403,
    error: "This page requires a different role.",
  };
}

export function authorizeRouteAccess(request, account, pathname = "") {
  const path = String(pathname || new URL(request.url).pathname || "/");
  if (!account || !account.userId) {
    return { ok: false, route: "signin", reason: "Not signed in." };
  }
  if (isSuspendedAccount(account)) {
    return { ok: false, route: "signin", reason: "This account is suspended." };
  }
  if (/^\/admin(\.html)?(\/.*)?$/i.test(path)) {
    if (!isAdminAccount(account))
      return {
        ok: false,
        route: "profile",
        reason: "Administrator access required.",
      };
    return { ok: true, route: "admin" };
  }
  if (!emailVerified(account)) {
    return {
      ok: false,
      route: "verify",
      reason: "Verify your email before accessing this page.",
    };
  }
  if (!isProfileComplete(account)) {
    return {
      ok: false,
      route: "profile-completion",
      reason: "Complete your profile before accessing this page.",
    };
  }

  if (
    /^\/(loads|load-board|loadboard|load-details|book-load|carrier-loads)(\.html)?(\/.*)?$/i.test(
      path,
    )
  ) {
    const bookingDecision = carrierLoadBookingDecision(account);
    if (!bookingDecision.allowed) {
      return {
        ok: false,
        route: bookingDecision.route || "pricing",
        reason:
          bookingDecision.reason ||
          bookingDecision.message ||
          "Load booking requires a verified carrier account.",
      };
    }
    return { ok: true, route: dashboardRoute(account) };
  }

  const decision = subscriptionAccessDecision(account);
  if (!decision.allowed) {
    return {
      ok: false,
      route: decision.route || "pricing",
      reason: decision.reason || "Subscription required.",
    };
  }

  return { ok: true, route: dashboardRoute(account) };
}

export async function requireAdminAccount(request, env) {
  const result = await requireSessionAccount(request, env);
  if (!result.ok) return result;
  if (!isAdminAccount(result.account)) {
    return { ok: false, status: 403, error: "Administrator access required." };
  }
  return result;
}

export function memberAccessPayload(account) {
  const loadBookingAccess = carrierLoadBookingPayload(account);
  return {
    emailVerified: emailVerified(account),
    emailVerifiedAt: account?.emailVerifiedAt || "",
    subscriptionStatus: subscriptionStatus(account),
    subscriptionAccess:
      account?.subscriptionAccess ||
      loadAccessFromType(account?.type, account?.paymentStatus),
    entitled: isEntitled(account),
    billingAttention: subscriptionStatus(account) === "past_due",
    role: normalizeRole(account?.role || roleFromType(account?.type)),
    carrierRole: carrierRoleLabel(account),
    carrierRoleAllowed: carrierRolePermitted(account),
    carrierVerificationStatus: loadBookingAccess.verified
      ? "verified"
      : "pending",
    carrierLoadBookingAccess: loadBookingAccess,
    profileComplete: isProfileComplete(account),
    dashboardRoute: dashboardRoute(account),
  };
}

export function extractStripeMetadata(session = {}) {
  return {
    userId: cleanString(
      session?.metadata?.userId ||
        session?.metadata?.user_id ||
        session?.client_reference_id ||
        "",
      80,
    ),
    email: normalizeEmail(
      session?.customer_details?.email ||
        session?.customer_email ||
        session?.metadata?.email ||
        session?.metadata?.customer_email ||
        session?.client_reference_id ||
        "",
    ),
    customerId: cleanString(
      session?.customer || session?.customer_id || "",
      120,
    ),
    subscriptionId: cleanString(
      session?.subscription || session?.subscription_id || "",
      120,
    ),
    planLabel: cleanString(
      session?.metadata?.plan_label ||
        session?.metadata?.plan ||
        session?.metadata?.product ||
        "",
      80,
    ),
    type: cleanString(
      session?.metadata?.profile_type || session?.metadata?.type || "",
      120,
    ),
  };
}
