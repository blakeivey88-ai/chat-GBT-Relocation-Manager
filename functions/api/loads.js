import {
  carrierLoadBookingDecision,
  cleanString,
  loadAccessFromType,
  requireEntitledAccount,
  validateCsrfToken,
} from "./_auth.js";

const LOADS = [
  {
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 685,
    mi: 250,
    pick: "Tomorrow 8am",
    wt: "3,200 lbs",
    eq: "26 ft Box",
    kind: "box",
    quick: true,
    lift: true,
    ramp: false,
    broker: "Blue Ridge Logistics",
    trust: 96,
    pay: "A",
    insurance: "Verified",
    tags: ["Verified broker", "Liftgate", "Quick-pay"],
  },
  {
    from: "Atlanta, GA",
    to: "Charlotte, NC",
    rate: 540,
    mi: 240,
    pick: "Today 2pm",
    wt: "1,800 lbs",
    eq: "16 ft Box w/ ramp",
    kind: "box",
    quick: false,
    lift: false,
    ramp: true,
    broker: "Peachtree Freight",
    trust: 91,
    pay: "B+",
    insurance: "Verified",
    tags: ["No-touch", "Ramp OK", "Dock both ends"],
  },
  {
    from: "Marietta, GA",
    to: "Birmingham, AL",
    rate: 430,
    mi: 170,
    pick: "Tomorrow 6am",
    wt: "2,400 lbs",
    eq: "26 ft Box w/ liftgate",
    kind: "box",
    quick: true,
    lift: true,
    ramp: false,
    broker: "Verified Moves Co.",
    trust: 89,
    pay: "A-",
    insurance: "Verified",
    tags: ["Quick-pay", "Liftgate", "Driver assist"],
  },
  {
    from: "Dalton, GA",
    to: "Knoxville, TN",
    rate: 610,
    mi: 120,
    pick: "Today 4pm",
    wt: "9,500 lbs",
    eq: "Truck + trailer / hotshot",
    kind: "trucktrailer",
    quick: true,
    lift: false,
    ramp: true,
    broker: "Appalachian Freight",
    trust: 94,
    pay: "A",
    insurance: "Verified",
    tags: ["Truck + trailer", "Machinery", "Forklift required"],
  },
  {
    from: "Macon, GA",
    to: "Savannah, GA",
    rate: 1250,
    mi: 170,
    pick: "Tomorrow 7am",
    wt: "22,000 lbs",
    eq: "Lowboy trailer",
    kind: "lowboy",
    quick: false,
    lift: false,
    broker: "Coastal Heavy Haul",
    trust: 97,
    tags: ["Oversize", "Permits set"],
  },
  {
    from: "Atlanta, GA",
    to: "Memphis, TN",
    rate: 1080,
    mi: 380,
    pick: "Tomorrow 10am",
    wt: "38,000 lbs",
    eq: "Dry Van 53 ft",
    kind: "dryvan",
    quick: true,
    lift: false,
    broker: "MidSouth Brokerage",
    trust: 88,
    tags: ["Quick-pay", "Drop trailer"],
  },
  {
    from: "Forest Park, GA",
    to: "Orlando, FL",
    rate: 1420,
    mi: 440,
    pick: "Fri 6am",
    wt: "41,000 lbs",
    eq: "Reefer",
    kind: "reefer",
    quick: true,
    lift: false,
    broker: "Cold Chain South",
    trust: 92,
    tags: ["Temp -10F", "Quick-pay"],
  },
  {
    from: "Cartersville, GA",
    to: "Mobile, AL",
    rate: 980,
    mi: 330,
    pick: "Today 3pm",
    wt: "44,000 lbs",
    eq: "53 ft flatbed",
    kind: "flatbed",
    quick: false,
    lift: false,
    broker: "Steel Lane Direct",
    trust: 85,
    tags: ["Tarps", "Chains"],
  },
  {
    from: "Atlanta, GA",
    to: "Dallas, TX",
    rate: 1650,
    mi: 780,
    pick: "Fri 8am",
    wt: "Preloaded trailer",
    eq: "Power Only",
    kind: "poweronly",
    quick: false,
    lift: false,
    broker: "Lone Star Drop",
    trust: 90,
    tags: ["Drop & hook"],
  },
  {
    from: "Chattanooga, TN",
    to: "Indianapolis, IN",
    rate: 1900,
    mi: 420,
    pick: "Mon 9am",
    wt: "42,000 lbs",
    eq: "53 ft Dry Van w/ liftgate",
    kind: "dryvanlift",
    quick: true,
    lift: true,
    ramp: false,
    broker: "Midwest Retail Freight",
    trust: 93,
    pay: "A-",
    insurance: "Verified",
    tags: ["53 ft", "Liftgate trailer", "Quick-pay"],
  },
  {
    from: "Birmingham, AL",
    to: "Houston, TX",
    rate: 2400,
    mi: 660,
    pick: "Tue 7am",
    wt: "39,000 lbs",
    eq: "53 ft Conestoga",
    kind: "conestoga",
    quick: false,
    lift: false,
    ramp: false,
    broker: "Covered Deck Logistics",
    trust: 90,
    pay: "B+",
    insurance: "Verified",
    tags: ["Conestoga", "No tarp", "Steel"],
  },
  {
    from: "Savannah, GA",
    to: "Charlotte, NC",
    rate: 3100,
    mi: 260,
    pick: "Wed 6am",
    wt: "62,000 lbs",
    eq: "Lowboy / RGN",
    kind: "lowboy",
    quick: true,
    lift: false,
    ramp: false,
    broker: "Heavy Haul Direct",
    trust: 95,
    pay: "A",
    insurance: "Verified",
    tags: ["Lowboy", "Oversize", "Permits"],
  },
  {
    from: "Jacksonville, FL",
    to: "Raleigh, NC",
    rate: 2100,
    mi: 430,
    pick: "Thu 8am",
    wt: "44,000 lbs",
    eq: "Step Deck",
    kind: "stepdeck",
    quick: false,
    lift: false,
    ramp: false,
    broker: "Southeast Deck Freight",
    trust: 87,
    pay: "B",
    insurance: "Verified",
    tags: ["Step deck", "Chains", "Appointment"],
  },
  {
    from: "Miami, FL",
    to: "Dallas, TX",
    rate: 1850,
    mi: 1350,
    pick: "This week",
    wt: "3 vehicles",
    eq: "Car carrier / auto transport",
    kind: "carcarrier",
    quick: false,
    lift: false,
    ramp: false,
    broker: "Interstate Auto Transport",
    trust: 90,
    pay: "A-",
    insurance: "Verified",
    tags: ["Car carrier", "Auto transport", "Multi-vehicle"],
    autoMode: "Fleet / dealership transport",
  },
];

function normalizeLoadRecord(load = {}, index = 0) {
  const from = String(load.from || load.origin || "").trim();
  const to = String(load.to || load.destination || "").trim();
  const pick = String(load.pick || load.pickup || "").trim();
  const slugSource = [from, to, pick, index]
    .filter(Boolean)
    .join("-")
    .toLowerCase();
  const id =
    cleanString(
      String(load.id || load.loadId || slugSource)
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, ""),
      120,
    ) || `load-${index}`;
  return {
    id,
    from,
    to,
    rate: Number(load.rate || 0) || 0,
    mi: Number(load.mi || 0) || 0,
    pick,
    wt: String(load.wt || load.weight || "").trim(),
    eq: String(load.eq || load.equipment || "").trim(),
    kind: String(load.kind || "")
      .trim()
      .toLowerCase(),
    quick: Boolean(load.quick),
    lift: Boolean(load.lift),
    ramp: Boolean(load.ramp),
    broker: String(load.broker || "").trim(),
    trust: Number(load.trust || 0) || 0,
    pay: String(load.pay || "").trim(),
    insurance: String(load.insurance || "").trim(),
    tags: Array.isArray(load.tags) ? load.tags.slice(0, 12) : [],
    autoMode: String(load.autoMode || "").trim(),
    pickupAt: String(load.pickupAt || "").trim(),
    deliveryAt: String(load.deliveryAt || "").trim(),
    status: String(load.status || "open")
      .trim()
      .toLowerCase(),
    createdAt: String(load.createdAt || "").trim(),
    expiresAt: String(load.expiresAt || "").trim(),
    postedByUserId: String(load.postedByUserId || "").trim(),
    notes: String(load.notes || "")
      .trim()
      .slice(0, 1000),
    claimRequests: Array.isArray(load.claimRequests)
      ? load.claimRequests.slice(0, 50)
      : [],
  };
}

const LOAD_CATALOG = LOADS.map((load, index) =>
  normalizeLoadRecord(load, index),
);
const LOAD_STORE_KEY = "marketplace:loads:v1";

async function readMarketplaceLoads(env) {
  if (!env?.RELOCATION_MANAGER_LEADS) return [];
  const raw = await env.RELOCATION_MANAGER_LEADS.get(LOAD_STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((load, index) => normalizeLoadRecord(load, index))
      : [];
  } catch {
    return [];
  }
}

async function writeMarketplaceLoads(env, loads) {
  if (!env?.RELOCATION_MANAGER_LEADS)
    throw new Error("Load storage is not configured.");
  await env.RELOCATION_MANAGER_LEADS.put(
    LOAD_STORE_KEY,
    JSON.stringify(loads.slice(0, 500)),
  );
}

function accountCanPostLoads(account) {
  const access = String(
    account?.loadAccess ||
      account?.subscriptionAccess ||
      loadAccessFromType(account?.type, account?.paymentStatus),
  ).toLowerCase();
  return (
    access === "request_post" || access === "claim_post" || access === "claim"
  );
}

function equipmentKind(value = "") {
  const text = String(value).toLowerCase();
  if (/box|liftgate|ramp/.test(text)) return "box";
  if (/cargo van/.test(text)) return "van";
  if (/truck \+ trailer|hotshot/.test(text)) return "trucktrailer";
  if (/car carrier|auto transport/.test(text)) return "carcarrier";
  if (/dry van/.test(text)) return "dryvan";
  if (/reefer/.test(text)) return "reefer";
  if (/conestoga/.test(text)) return "conestoga";
  if (/step deck/.test(text)) return "stepdeck";
  if (/flatbed/.test(text)) return "flatbed";
  if (/lowboy|rgn/.test(text)) return "lowboy";
  if (/power only/.test(text)) return "poweronly";
  return "other";
}

function postedLoadFromBody(body, account) {
  const from = cleanString(body.from || body.pickupCity || "", 120);
  const to = cleanString(body.to || body.deliveryCity || "", 120);
  const pickupDate = cleanString(body.pickupDate || "", 20);
  const pickupTime = cleanString(body.pickupTime || "", 20);
  const deliveryDate = cleanString(body.deliveryDate || "", 20);
  const eq = cleanString(body.equipment || "", 120);
  const wt = cleanString(body.weight || "", 80);
  const rate = Number(body.rate || 0);
  const mi = Number(body.miles || 0);
  if (
    !from ||
    !to ||
    !pickupDate ||
    !pickupTime ||
    !eq ||
    !wt ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return {
      error:
        "Pickup, delivery, pickup date/time, equipment, weight, and a valid offered rate are required.",
    };
  }
  const createdAt = new Date().toISOString();
  const pickupTimestamp = Date.parse(`${pickupDate}T${pickupTime}:00Z`);
  if (!Number.isFinite(pickupTimestamp))
    return { error: "Enter a valid pickup date and time." };
  const pickupAt = new Date(pickupTimestamp).toISOString();
  const deliveryTimestamp = deliveryDate
    ? Date.parse(`${deliveryDate}T12:00:00Z`)
    : null;
  if (deliveryDate && !Number.isFinite(deliveryTimestamp))
    return { error: "Enter a valid delivery date." };
  const expiresAt = new Date(
    Math.max(
      Date.now() + 60 * 60 * 1000,
      Date.parse(pickupAt) + 24 * 60 * 60 * 1000,
    ),
  ).toISOString();
  return {
    load: normalizeLoadRecord(
      {
        id: `load_${crypto.randomUUID().replace(/-/g, "")}`,
        from,
        to,
        pick:
          new Date(pickupAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          }) + " UTC",
        pickupAt,
        deliveryAt: deliveryTimestamp
          ? new Date(deliveryTimestamp).toISOString()
          : "",
        rate,
        mi: Number.isFinite(mi) && mi > 0 ? Math.round(mi) : 0,
        wt,
        eq,
        kind: equipmentKind(eq),
        quick: Boolean(body.quickPay),
        lift: /liftgate/i.test(eq),
        ramp: /ramp/i.test(eq),
        broker: cleanString(
          account.company || account.name || "Verified member",
          120,
        ),
        trust: Number(account.trustScore || account.score || 0) || 0,
        pay: cleanString(account.paymentGrade || "", 20),
        insurance: cleanString(
          account.insuranceVerification ||
            account.insuranceStatus ||
            "Pending verification",
          60,
        ),
        tags: [
          "Member posted",
          body.directLoad === false ? "Multi-stop" : "Direct load",
        ],
        autoMode: cleanString(body.autoMode || "", 80),
        status: "open",
        createdAt,
        expiresAt,
        postedByUserId: account.userId,
        notes: cleanString(body.notes || "", 1000),
        claimRequests: [],
      },
      0,
    ),
  };
}

export async function onRequestGet(context) {
  try {
    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok)
      return json({ ok: false, error: access.error }, access.status || 401);

    const decision = carrierLoadBookingDecision(access.account);
    if (!decision.allowed) {
      return json(
        {
          ok: false,
          error:
            decision.message ||
            decision.reason ||
            "Load access is unavailable.",
          route: decision.route || "pricing",
          reason: decision.reason || "",
        },
        403,
      );
    }

    const url = new URL(context.request.url);
    const loadId = cleanString(url.searchParams.get("loadId") || "", 120);
    const q = String(url.searchParams.get("q") || "")
      .trim()
      .toLowerCase();
    const from = String(url.searchParams.get("from") || "")
      .trim()
      .toLowerCase();
    const to = String(url.searchParams.get("to") || "")
      .trim()
      .toLowerCase();
    const equipment = String(url.searchParams.get("equipment") || "")
      .trim()
      .toLowerCase();
    const kind = String(url.searchParams.get("kind") || "")
      .trim()
      .toLowerCase();
    const quick = String(url.searchParams.get("quick") || "")
      .trim()
      .toLowerCase();
    const minRate = Number(url.searchParams.get("minRate") || 0) || 0;
    const limit = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("limit") || 25) || 25),
    );

    const now = Date.now();
    let loads = (await readMarketplaceLoads(context.env)).filter((item) => {
      const expiresAt = Date.parse(item.expiresAt || "");
      return (
        item.status === "open" &&
        (!Number.isFinite(expiresAt) || expiresAt > now)
      );
    });
    const loadCount = loads.length;
    if (loadId) loads = loads.filter((item) => item.id === loadId);
    if (q)
      loads = loads.filter((item) =>
        [
          item.from,
          item.to,
          item.eq,
          item.broker,
          item.kind,
          item.pick,
          item.wt,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    if (from)
      loads = loads.filter((item) => item.from.toLowerCase().includes(from));
    if (to) loads = loads.filter((item) => item.to.toLowerCase().includes(to));
    if (equipment && equipment !== "all")
      loads = loads.filter(
        (item) =>
          item.eq.toLowerCase().includes(equipment) || item.kind === equipment,
      );
    if (kind && kind !== "all")
      loads = loads.filter((item) => item.kind === kind);
    if (quick === "true" || quick === "1" || quick === "yes")
      loads = loads.filter((item) => item.quick);
    if (minRate)
      loads = loads.filter((item) => Number(item.rate || 0) >= minRate);
    loads = loads.slice(0, limit);

    if (loadId) {
      const load = loads[0] || null;
      if (!load) return json({ ok: false, error: "Load not found." }, 404);
      return json({
        ok: true,
        load,
        loads: [load],
        count: 1,
        loadCount,
        bookingAccess: decision,
        route: "loads",
      });
    }

    return json({
      ok: true,
      loads,
      count: loads.length,
      loadCount,
      bookingAccess: decision,
      route: "loads",
    });
  } catch {
    return json({ ok: false, error: "Load lookup failed." }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    if (!validateCsrfToken(context.request, body)) {
      return json({ ok: false, error: "Invalid CSRF token." }, 403);
    }

    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok)
      return json({ ok: false, error: access.error }, access.status || 401);

    const action = String(body.action || "claim")
      .trim()
      .toLowerCase();
    if (action === "post") {
      if (!accountCanPostLoads(access.account)) {
        return json(
          {
            ok: false,
            error: "Your plan does not include load posting.",
            route: "pricing",
          },
          403,
        );
      }
      const created = postedLoadFromBody(body, access.account);
      if (created.error) return json({ ok: false, error: created.error }, 400);
      const loads = await readMarketplaceLoads(context.env);
      loads.unshift(created.load);
      await writeMarketplaceLoads(context.env, loads);
      return json(
        {
          ok: true,
          message: "Load posted.",
          load: created.load,
          route: "post",
        },
        201,
      );
    }

    if (action !== "claim")
      return json({ ok: false, error: "Unsupported load action." }, 400);

    const decision = carrierLoadBookingDecision(access.account);
    if (!decision.allowed) {
      return json(
        {
          ok: false,
          error:
            decision.message ||
            decision.reason ||
            "Load access is unavailable.",
          route: decision.route || "pricing",
          reason: decision.reason || "",
        },
        403,
      );
    }

    const loadId = cleanString(body.loadId || body.id || "", 120);
    const loads = await readMarketplaceLoads(context.env);
    const load = loads.find(
      (item) => item.id === loadId && item.status === "open",
    );
    if (!load) return json({ ok: false, error: "Load not found." }, 404);

    const duplicate = (load.claimRequests || []).some(
      (request) => request.userId === access.account.userId,
    );
    if (!duplicate) {
      load.claimRequests = [
        {
          id: `claim_${crypto.randomUUID().replace(/-/g, "")}`,
          userId: access.account.userId,
          name: cleanString(access.account.name || "", 120),
          company: cleanString(access.account.company || "", 120),
          status: "pickup_requested",
          requestedAt: new Date().toISOString(),
        },
        ...(load.claimRequests || []),
      ].slice(0, 50);
      await writeMarketplaceLoads(context.env, loads);
    }

    return json({
      ok: true,
      message: duplicate ? "Pickup already requested." : "Pickup request sent.",
      load,
      claimedLoad: load,
      bookingAccess: decision,
      route: "loads",
    });
  } catch {
    return json({ ok: false, error: "Load action failed." }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-csrf-token",
  };
}
