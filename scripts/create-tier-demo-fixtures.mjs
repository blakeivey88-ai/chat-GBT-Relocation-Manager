#!/usr/bin/env node
/**
 * Phase 3 — create / refresh demo accounts for each paid tier (capacity demos).
 * Password is fixed for demos; change before any public share.
 *
 * Usage:
 *   node scripts/create-tier-demo-fixtures.mjs
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WT = path.resolve(__dirname, "..");
const NOW = new Date().toISOString();
const END = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const DEMO_PASS = process.env.RM_DEMO_PASS || "DemoTier8769$";
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);

const TIERS = [
  {
    key: "driver",
    email: `demo.driver.${stamp}@example.com`,
    paymentStatus: "paid_driver",
    seats: 1,
    planLabel: "Independent Driver $29.99 (demo)",
    type: "Independent driver / self-insured - $29.99/mo",
    access: "claim_post",
    price: 2999,
  },
  {
    key: "fleet-starter",
    email: `demo.fleet3.${stamp}@example.com`,
    paymentStatus: "paid_fleet_starter",
    seats: 3,
    planLabel: "Carrier & Broker Starter $59.99 (demo)",
    type: "Broker 1–3 trucks - $59.99/mo",
    access: "claim_post",
    price: 5999,
  },
  {
    key: "fleet-growth",
    email: `demo.fleet7.${stamp}@example.com`,
    paymentStatus: "paid_fleet_growth",
    seats: 7,
    planLabel: "Carrier & Broker Growth $79.99 (demo)",
    type: "Broker 4–7 trucks - $79.99/mo",
    access: "claim_post",
    price: 7999,
  },
  {
    key: "fleet-pro",
    email: `demo.fleet12.${stamp}@example.com`,
    paymentStatus: "paid_fleet_pro",
    seats: 12,
    planLabel: "Carrier & Broker Pro $149.99 (demo)",
    type: "Broker 8–12 trucks - $149.99/mo",
    access: "claim_post",
    price: 14999,
  },
  {
    key: "dispatcher",
    email: `demo.dispatch.${stamp}@example.com`,
    paymentStatus: "paid_dispatcher_broker",
    seats: 12,
    planLabel: "Dispatcher & Broker $189.99 (demo)",
    type: "Dispatcher / Broker - $189.99/mo",
    access: "claim_post",
    price: 18999,
  },
];

function sqlQuote(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function wranglerD1(sql) {
  const result = spawnSync(
    path.join(WT, "node_modules/.bin/wrangler"),
    ["d1", "execute", "relocation-manager-db", "--remote", "--command", sql],
    { cwd: WT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "d1 failed");
  }
  return result.stdout;
}

function hashPlaceholder() {
  // Accounts need a real password hash for login — register via API instead.
  return randomBytes(8).toString("hex");
}

async function registerAndFixture(tier) {
  const userId = `usr_demo_${tier.key}_${stamp}`;
  // Prefer API register path used by E2E so password hashing is correct
  const base = process.env.RM_BASE || "https://relocationmanagerusa.com";
  const jar = { cookies: "" };
  async function api(method, p, body, csrf) {
    const headers = {
      accept: "application/json",
      "user-agent": "RM-TierFixtures/1.0",
      "content-type": "application/json",
    };
    if (jar.cookies) headers.cookie = jar.cookies;
    if (csrf) {
      headers["x-csrf-token"] = csrf;
      body = { ...body, csrfToken: csrf };
    }
    const res = await fetch(base + p, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (set.length) {
      jar.cookies = set.map((c) => c.split(";")[0]).join("; ");
    } else if (res.headers.get("set-cookie")) {
      jar.cookies = res.headers.get("set-cookie").split(",")[0].split(";")[0];
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  let seed = await api("GET", "/api/account");
  let csrf = seed.data?.csrfToken;
  let reg = await api(
    "POST",
    "/api/account",
    {
      action: "register",
      password: DEMO_PASS,
      checkoutPlan: tier.key === "driver" ? "driver" : tier.key,
      profileView: "driver",
      rememberMe: true,
      profile: {
        email: tier.email,
        name: `Demo ${tier.key}`,
        company: `Demo ${tier.seats}-seat Fleet LLC`,
        type: tier.type,
        role: "Owner-Operator",
        city: "Dallas",
        state: "TX",
        phone: "214-555-0199",
        profileView: "driver",
      },
    },
    csrf,
  );
  if (reg.status === 403 && reg.data?.csrfToken) {
    csrf = reg.data.csrfToken;
    reg = await api(
      "POST",
      "/api/account",
      {
        action: "register",
        password: DEMO_PASS,
        checkoutPlan: tier.key === "driver" ? "driver" : tier.key,
        profileView: "driver",
        rememberMe: true,
        profile: {
          email: tier.email,
          name: `Demo ${tier.key}`,
          company: `Demo ${tier.seats}-seat Fleet LLC`,
          type: tier.type,
          role: "Owner-Operator",
          city: "Dallas",
          state: "TX",
          phone: "214-555-0199",
          profileView: "driver",
        },
      },
      csrf,
    );
  }
  if (!reg.data?.ok && !String(reg.data?.error || "").match(/already|exists/i)) {
    // fallback: may already exist — still apply D1 fixture
    console.warn("register note", tier.email, reg.status, reg.data?.error);
  }
  if (reg.data?.verificationToken) {
    csrf = (await api("GET", "/api/account")).data?.csrfToken || csrf;
    await api(
      "POST",
      "/api/account",
      { action: "verify-email", token: reg.data.verificationToken },
      csrf,
    );
  }

  const uid = reg.data?.profile?.userId || reg.data?.userId || userId;
  wranglerD1(`UPDATE accounts SET
    email_verified_at = COALESCE(NULLIF(email_verified_at,''), ${sqlQuote(NOW)}),
    payment_status = ${sqlQuote(tier.paymentStatus)},
    subscription_status = 'active',
    subscription_access = ${sqlQuote(tier.access)},
    load_access = ${sqlQuote(tier.access)},
    plan_label = ${sqlQuote(tier.planLabel)},
    type = ${sqlQuote(tier.type)},
    role = 'Owner-Operator',
    checkout_plan = ${sqlQuote(tier.key === "driver" ? "driver" : tier.key)},
    profile_view = 'driver',
    paid_at = ${sqlQuote(NOW)},
    subscription_current_period_end = ${sqlQuote(END)},
    insurance_status = 'Verified',
    insurance_provider = 'Demo Mutual (TEST ONLY)',
    insurance_policy_last4 = '0000',
    insurance_expiration = '2027-12-31',
    insurance_document_url = 'https://relocationmanagerusa.com/safety.html#demo-fixture',
    verification = 'Verified carrier (tier demo fixture)',
    city = 'Dallas',
    state = 'TX',
    name = COALESCE(NULLIF(name,''), ${sqlQuote(`Demo ${tier.key}`)}),
    company = COALESCE(NULLIF(company,''), ${sqlQuote(`Demo ${tier.seats}-seat Fleet LLC`)}),
    truck_count = ${tier.seats},
    note = ${sqlQuote(`TIER_DEMO_FIXTURE_${stamp} — seats=${tier.seats}; no real Stripe`)},
    updated_at = ${sqlQuote(NOW)}
  WHERE lower(email) = ${sqlQuote(tier.email.toLowerCase())};`);

  // Resolve user_id from DB
  const lookup = wranglerD1(
    `SELECT user_id FROM accounts WHERE lower(email)=${sqlQuote(tier.email.toLowerCase())} LIMIT 1;`,
  );
  const m = lookup.match(/usr_[a-z0-9]+/i);
  const realUid = m ? m[0] : uid;
  wranglerD1(`INSERT INTO carrier_verifications (
    carrier_verification_id, user_id, carrier_name, mc_dot, status, load_id, checklist, created_at, updated_at
  ) VALUES (
    ${sqlQuote(`demo_cv_${tier.key}_${stamp}`)},
    ${sqlQuote(realUid)},
    ${sqlQuote(`Demo ${tier.seats}-seat Fleet LLC`)},
    '',
    'verified',
    '',
    ${sqlQuote(JSON.stringify({ source: "tier-demo", seats: tier.seats, stamp }))},
    ${sqlQuote(NOW)},
    ${sqlQuote(NOW)}
  );`);

  return {
    ...tier,
    userId: realUid,
    password: DEMO_PASS,
  };
}

const results = [];
for (const tier of TIERS) {
  // sequential to avoid rate limits
  // eslint-disable-next-line no-await-in-loop
  const row = await registerAndFixture(tier);
  results.push(row);
  console.log(JSON.stringify({ ok: true, email: row.email, seats: row.seats, paymentStatus: row.paymentStatus }));
}

const outDir = path.join(WT, "..", "..", "..", "..", "Codex", "2026-08-11", "h", "outputs");
// fallback write next to script if path odd
let outPath = path.join(process.env.HOME || "", "Documents/Codex/2026-08-11/h/outputs");
try {
  mkdirSync(outPath, { recursive: true });
} catch {
  outPath = path.join(WT, "data");
  mkdirSync(outPath, { recursive: true });
}
const file = path.join(outPath, `tier-demo-fixtures-${stamp}.json`);
writeFileSync(
  file,
  JSON.stringify(
    {
      createdAt: NOW,
      password: DEMO_PASS,
      note: "Demo accounts only. Do not use for real freight. Change password if shared.",
      tiers: results,
    },
    null,
    2,
  ),
);
console.log("EVIDENCE", file);
console.log("PASSWORD", DEMO_PASS);
console.log(hashPlaceholder()); // keep import used
