import {
  carrierLoadBookingDecision,
  cleanString,
  isEntitled,
  loadAccessFromType,
  readAccountByUserId,
  requireEntitledAccount,
  upsertAccount,
  validateCsrfToken,
} from "./_auth.js";
import { recordLoadHistory } from "../lib/load-history.js";
import { buildBrandedEmail, sendTransactionalEmail } from "../lib/email.js";

// One place to record failures. Cloudflare captures console output in the
// Workers log stream, so a swallowed error is still visible when something
// goes wrong in production. Never log request bodies — they carry contact
// phone numbers and other member details.
function logFailure(scope, error, detail = {}) {
  try {
    console.error(
      JSON.stringify({
        scope,
        message: String(error?.message || error || "unknown"),
        ...detail,
      }),
    );
  } catch {
    /* logging must never throw */
  }
}

// Confirmation emails must never break a marketplace action: fire, log nothing,
// and swallow failures (email may not be configured in every environment).
async function sendMarketplaceEmail(
  env,
  { to, subject, headline, bodyLines = [], ctaLabel = "", ctaUrl = "", requestId = "" },
) {
  if (!to) return;
  try {
    const { text, html } = buildBrandedEmail({ headline, bodyLines, ctaLabel, ctaUrl });
    await sendTransactionalEmail(env, { to, subject, text, html, requestId });
  } catch {
    /* not configured or provider error — the API response is the fallback */
  }
}

function memberSuppliedConfirmationTimestamp(value, nowIso) {
  const text = cleanString(value || "", 40);
  if (!text) return "";
  const timestamp = Date.parse(text);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp > now) {
    return "";
  }
  return new Date(timestamp).toISOString();
}

function memberSuppliedVerificationStatus(value) {
  const text = cleanString(value || "", 80);
  if (!text) return "";
  const neutralStatuses = new Set([
    "details supplied",
    "member supplied",
    "not provided",
    "pending review",
    "unverified",
  ]);
  return neutralStatuses.has(text.toLowerCase()) ? text : "Member supplied";
}

// Plan truck count = how many pickups can run at once. A truck can only be in
// one place at a time, so needing more concurrent loads means a bigger plan.
// The limit comes from the PAID plan, never from self-reported truck counts.
function planConcurrencyLimit(account) {
  const payment = String(account?.paymentStatus || "").toLowerCase();
  const type = String(account?.type || "").toLowerCase();
  if (payment === "paid_shipper" || /customer|pickup/.test(type)) return 0;
  if (
    payment === "paid_driver" ||
    /independent driver|owner[- ]?operator|self[- ]?insured/.test(type)
  )
    return 1;
  if (payment === "paid_fleet_starter" || /1[-–]3/.test(type)) return 3;
  if (payment === "paid_fleet_growth" || /4[-–]7/.test(type)) return 7;
  if (payment === "paid_fleet_pro" || /[78][-–]12/.test(type)) return 12;
  if (payment === "paid_dispatcher_broker" || /dispatcher/.test(type))
    return 12;
  return 1; // unknown plans behave like one truck — safe default
}

function activeAuthorizedPickupCount(account, excludeLoadId = "") {
  return (Array.isArray(account?.activePickups) ? account.activePickups : [])
    .filter(
      (item) =>
        item?.serverAuthorized === true &&
        (!excludeLoadId || String(item?.loadId || item?.id || "") !== excludeLoadId) &&
        !/completed|delivered|cancelled|canceled|declined|not[\s_-]?selected/i.test(
          String(item?.status || ""),
        ),
    ).length;
}

// Priority placement: loads posted by Carrier & Broker Pro and Dispatcher &
// Broker accounts rank above standard listings (newest first within each rank).
function posterPriorityRank(account) {
  const paymentStatus = String(account?.paymentStatus || "").toLowerCase();
  if (/paid_fleet_pro|paid_dispatcher_broker/.test(paymentStatus)) return 1;
  const type = String(account?.type || "").toLowerCase();
  if (/broker [78][–-]12|8[–-]12 trucks|dispatcher/.test(type)) return 1;
  return 0;
}

const MAX_LOAD_PHOTOS = 3;
const LOAD_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    photos: Array.isArray(load.photos)
      ? load.photos.slice(0, MAX_LOAD_PHOTOS).map((photo) => ({
          id: cleanString(photo?.id || "", 120),
          name: cleanString(photo?.name || "Freight photo", 100),
          type: LOAD_PHOTO_TYPES.has(String(photo?.type || "").toLowerCase())
            ? String(photo.type).toLowerCase()
            : "image/jpeg",
          alt: cleanString(photo?.alt || "Freight condition photo", 160),
        })).filter((photo) => photo.id)
      : [],
    reports: Array.isArray(load.reports) ? load.reports.slice(0, 50) : [],
    reportCount: Number(load.reportCount || 0) || 0,
    autoMode: String(load.autoMode || "").trim(),
    pickupAt: String(load.pickupAt || "").trim(),
    deliveryAt: String(load.deliveryAt || "").trim(),
    status: String(load.status || "open")
      .trim()
      .toLowerCase(),
    createdAt: String(load.createdAt || "").trim(),
    expiresAt: String(load.expiresAt || "").trim(),
    lastConfirmedAt: String(load.lastConfirmedAt || "").trim(),
    confirmedAt: String(load.confirmedAt || "").trim(),
    verificationStatus: String(load.verificationStatus || "").trim(),
    paymentTerms: String(load.paymentTerms || load.pay || "").trim(),
    commodity: String(load.commodity || "").trim().slice(0, 160),
    dimensions: String(load.dimensions || "").trim().slice(0, 120),
    loadingHelp: String(load.loadingHelp || "").trim().slice(0, 120),
    siteConditions: String(load.siteConditions || "").trim().slice(0, 200),
    contactName: String(load.contactName || "").trim().slice(0, 120),
    contactPhone: String(load.contactPhone || "").trim().slice(0, 40),
    declaredValue: Number(load.declaredValue || 0) || 0,
    dock: typeof load.dock === "boolean" ? load.dock : null,
    forklift: typeof load.forklift === "boolean" ? load.forklift : null,
    postedByUserId: String(load.postedByUserId || "").trim(),
    postedByLogoUrl: String(load.postedByLogoUrl || "").trim().slice(0, 280),
    priority: Number(load.priority || 0) || 0,
    notes: String(load.notes || "")
      .trim()
      .slice(0, 1000),
    pricingMode: ["open_bids", "target"].includes(
      String(load.pricingMode || "").trim().toLowerCase(),
    )
      ? String(load.pricingMode).trim().toLowerCase()
      : "target",
    jobType: String(load.jobType || "")
      .trim()
      .slice(0, 40),
    rateIncludesHint: String(load.rateIncludesHint || "")
      .trim()
      .slice(0, 400),
    claimRequests: Array.isArray(load.claimRequests)
      ? load.claimRequests.slice(0, 50)
      : [],
    acceptedByUserId: String(load.acceptedByUserId || "").trim(),
    acceptedAt: String(load.acceptedAt || "").trim(),
    acceptedRequestId: String(load.acceptedRequestId || "").trim(),
    agreedRate: Number(load.agreedRate || 0) || 0,
  };
}

const LOAD_STORE_KEY = "marketplace:loads:v1";
const LOAD_PHOTO_PREFIX = "marketplace:load-photo:v1";
const MAX_LOAD_PHOTO_DATA_URL_LENGTH = 350_000;
const MAX_LOAD_PHOTO_TOTAL_LENGTH = 900_000;

function loadPhotoKey(loadId, photoId) {
  return `${LOAD_PHOTO_PREFIX}:${loadId}:${photoId}`;
}

function normalizedLoadPhotoInput(value) {
  const photos = Array.isArray(value) ? value.slice(0, MAX_LOAD_PHOTOS + 1) : [];
  if (photos.length > MAX_LOAD_PHOTOS) {
    return { error: `Add no more than ${MAX_LOAD_PHOTOS} freight photos.` };
  }
  let totalLength = 0;
  const items = [];
  for (const photo of photos) {
    const dataUrl = String(photo?.dataUrl || "").trim();
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    const type = String(match?.[1] || "").toLowerCase();
    if (!match || !LOAD_PHOTO_TYPES.has(type)) {
      return { error: "Photos must be JPEG, PNG, or WebP images." };
    }
    if (dataUrl.length > MAX_LOAD_PHOTO_DATA_URL_LENGTH) {
      return { error: "Each photo must be 250 KB or smaller after resizing." };
    }
    totalLength += dataUrl.length;
    if (totalLength > MAX_LOAD_PHOTO_TOTAL_LENGTH) {
      return { error: "The combined resized photos are too large." };
    }
    const bytes = base64Bytes(match[2]);
    const validMagic =
      (type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
      (type === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
      (type === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
    if (!validMagic) return { error: "One of the selected files is not a valid image." };
    const id = `photo_${crypto.randomUUID().replace(/-/g, "")}`;
    items.push({
      metadata: {
        id,
        name: cleanString(photo?.name || "Freight photo", 100),
        type,
        alt: cleanString(photo?.alt || "Freight condition photo", 160),
      },
      dataUrl,
    });
  }
  return { items, metadata: items.map((item) => item.metadata) };
}

function base64Bytes(value) {
  const decoded = atob(String(value || ""));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function storedPhotoResponse(dataUrl, type) {
  const encoded = String(dataUrl || "").split(",", 2)[1] || "";
  return new Response(base64Bytes(encoded), {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "private, max-age=300",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
    },
  });
}

async function readMarketplaceLoads(env) {
  if (!env?.RELOCATION_MANAGER_LEADS) return [];
  const raw = await env.RELOCATION_MANAGER_LEADS.get(LOAD_STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const loads = Array.isArray(parsed)
      ? parsed.map((load, index) => normalizeLoadRecord(load, index))
      : [];
    if (!env?.RELOCATION_MANAGER_DB?.prepare) return loads;
    try {
      // Only ask for acceptances belonging to loads in this snapshot. The
      // old unbounded form scanned every load ever accepted on every single
      // board read.
      const ids = loads.map((item) => item.id).filter(Boolean);
      if (!ids.length) return loads;
      // D1 permits at most 100 bound parameters per query. The KV catalog can
      // hold 500 loads, so read the acceptance overlay in safe chunks.
      const acceptedRows = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const chunk = ids.slice(offset, offset + 100);
        const placeholders = chunk.map(() => "?").join(",");
        const result = await env.RELOCATION_MANAGER_DB.prepare(
          `SELECT load_id, route, rate, updated_at
           FROM loads
           WHERE status = 'accepted'
             AND load_id IN (${placeholders})`,
        )
          .bind(...chunk)
          .all();
        acceptedRows.push(...(result?.results || []));
      }
      for (const row of acceptedRows) {
        let acceptance = null;
        try {
          acceptance = JSON.parse(String(row.route || ""));
        } catch {
          continue;
        }
        if (acceptance?.kind !== "marketplace_acceptance_v1") continue;
        const load = loads.find((item) => item.id === row.load_id);
        if (!load) continue;
        load.status = "accepted";
        load.acceptedByUserId = cleanString(acceptance.carrierUserId || "", 80);
        load.acceptedRequestId = cleanString(acceptance.bidId || "", 120);
        load.acceptedAt = cleanString(acceptance.acceptedAt || row.updated_at || "", 80);
        load.agreedRate = Number(acceptance.agreedRate || row.rate || 0) || load.rate;
        load.claimRequests = (load.claimRequests || []).map((item) => ({
          ...item,
          status: item.id === load.acceptedRequestId ? "accepted" : "not_selected",
        }));
      }
    } catch (error) {
      logFailure("loads.readAcceptanceOverlay", error);
      // D1 read failures leave the KV snapshot visible; acceptance itself
      // still fails closed when its transactional store is unavailable.
    }
    return loads;
  } catch {
    return [];
  }
}

const MAX_STORED_LOADS = 500;

// Photo bodies live under their own KV keys. Whenever a load leaves the
// catalog its photos have to go with it, or they sit in KV forever with
// nothing pointing at them.
async function deleteLoadPhotos(env, loads = []) {
  for (const load of loads) {
    for (const photo of load?.photos || []) {
      if (!photo?.id) continue;
      try {
        await env?.RELOCATION_MANAGER_LEADS?.delete(
          loadPhotoKey(load.id, photo.id),
        );
      } catch (error) {
        logFailure("loads.deletePhoto", error, {
          loadId: load?.id,
          photoId: photo?.id,
        });
      }
    }
  }
}

async function writeMarketplaceLoads(env, loads) {
  if (!env?.RELOCATION_MANAGER_LEADS)
    throw new Error("Load storage is not configured.");
  const keep = loads.slice(0, MAX_STORED_LOADS);
  const evicted = loads.slice(MAX_STORED_LOADS);
  await env.RELOCATION_MANAGER_LEADS.put(LOAD_STORE_KEY, JSON.stringify(keep));
  if (evicted.length) {
    // Hitting the cap means real records are being dropped. That should be
    // visible, not silent — it is the signal to move the catalog into D1.
    logFailure("loads.catalogCapReached", "load catalog full", {
      evicted: evicted.length,
      kept: keep.length,
      evictedIds: evicted.slice(0, 10).map((item) => item?.id),
    });
    await deleteLoadPhotos(env, evicted);
  }
}

async function commitLoadAcceptance(
  env,
  { load, bidId, carrier, shipperUserId, agreedRate, acceptedAt, planLimit, pickup },
) {
  if (!env?.RELOCATION_MANAGER_DB?.prepare || !env?.RELOCATION_MANAGER_DB?.batch) {
    return { ok: false, unavailable: true };
  }
  const acceptance = {
    kind: "marketplace_acceptance_v1",
    loadId: load.id,
    bidId,
    carrierUserId: carrier.userId,
    shipperUserId,
    agreedRate: Number(agreedRate || 0),
    postedRate: Number(load.rate || 0),
    acceptedAt,
  };
  const acceptanceJson = JSON.stringify(acceptance);
  const pickupJson = JSON.stringify(pickup);
  try {
    const loadStatement = env.RELOCATION_MANAGER_DB.prepare(
      `INSERT INTO loads (
        load_id, posted_by_user_id, route, equipment, weight, rate,
        status, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, 'accepted', ?, ?
      FROM accounts
      WHERE user_id = ?
        AND (
          SELECT COUNT(*)
          FROM json_each(
            CASE WHEN json_valid(accounts.active_pickups)
              THEN accounts.active_pickups ELSE '[]' END
          )
          WHERE COALESCE(json_extract(value, '$.serverAuthorized'), 0) = 1
            AND LOWER(COALESCE(json_extract(value, '$.status'), ''))
              NOT IN (
                'completed', 'complete', 'delivered', 'declined',
                'cancelled', 'canceled', 'not selected', 'not_selected'
              )
            AND COALESCE(
              json_extract(value, '$.loadId'),
              json_extract(value, '$.id'),
              ''
            ) <> ?
        ) < ?
      ON CONFLICT(load_id) DO UPDATE SET
        route = excluded.route,
        equipment = excluded.equipment,
        weight = excluded.weight,
        rate = excluded.rate,
        status = 'accepted',
        updated_at = excluded.updated_at
      WHERE loads.status IN ('draft', 'open')`,
    ).bind(
      load.id,
      shipperUserId,
      acceptanceJson,
      load.eq,
      load.wt,
      Number(agreedRate || 0),
      load.createdAt || acceptedAt,
      acceptedAt,
      carrier.userId,
      load.id,
      planLimit,
    );
    const accountStatement = env.RELOCATION_MANAGER_DB.prepare(
      `UPDATE accounts
       SET active_pickups = json_insert(
         COALESCE(
           (
             SELECT json_group_array(json(value))
             FROM json_each(
               CASE WHEN json_valid(accounts.active_pickups)
                 THEN accounts.active_pickups ELSE '[]' END
             )
             WHERE COALESCE(
               json_extract(value, '$.loadId'),
               json_extract(value, '$.id'),
               ''
             ) <> ?
           ),
           json('[]')
         ),
         '$[#]',
         json(?)
       ),
       updated_at = ?
       WHERE user_id = ?
         AND EXISTS (
           SELECT 1 FROM loads
           WHERE load_id = ? AND status = 'accepted' AND route = ?
         )`,
    ).bind(
      load.id,
      pickupJson,
      acceptedAt,
      carrier.userId,
      load.id,
      acceptanceJson,
    );
    const results = await env.RELOCATION_MANAGER_DB.batch([
      loadStatement,
      accountStatement,
    ]);
    const loadChanges = Number(results?.[0]?.meta?.changes ?? 0);
    const accountChanges = Number(results?.[1]?.meta?.changes ?? 0);
    if (loadChanges === 1 && accountChanges === 1) {
      return { ok: true, acceptance, alreadyCommitted: false };
    }
    const existing = await env.RELOCATION_MANAGER_DB.prepare(
      `SELECT route FROM loads WHERE load_id = ? AND status = 'accepted' LIMIT 1`,
    )
      .bind(load.id)
      .first();
    if (String(existing?.route || "") === acceptanceJson && accountChanges === 1) {
      return { ok: true, acceptance, alreadyCommitted: true };
    }
    return {
      ok: false,
      unavailable: false,
      reason: existing ? "load_already_accepted" : "plan_concurrency_limit",
    };
  } catch (error) {
    logFailure("loads.commitAcceptance", error, { loadId: load?.id });
    return { ok: false, unavailable: true };
  }
}

function accountCanPostLoads(account) {
  const access = String(
    account?.loadAccess ||
      account?.subscriptionAccess ||
      loadAccessFromType(account?.type, account?.paymentStatus),
  ).toLowerCase();
  const paymentStatus = String(account?.paymentStatus || "").toLowerCase();
  const roleText = String(
    `${account?.role || ""} ${account?.type || ""} ${account?.companyType || ""}`,
  ).toLowerCase();
  const paidCarrier =
    paymentStatus === "paid_driver" ||
    paymentStatus.startsWith("paid_fleet_") ||
    /driver|owner[- ]?operator|carrier|broker|fleet|motor carrier/.test(
      roleText,
    );
  // "claim" remains the safe default for unknown accounts. A paid carrier
  // with explicit claim access is the approved exception: carriers may post
  // as well as bid, while the $9.99 shipper request_post gate stays intact.
  return (
    access === "request" ||
    access === "request_post" ||
    access === "post_only" ||
    access === "claim_post" ||
    (access === "claim" && paidCarrier)
  );
}

function visibleLoadRecord(load, account) {
  const isOwner =
    Boolean(account?.userId) && load.postedByUserId === account.userId;
  const record = { ...load };
  if (isOwner) {
    record.claimRequests = (load.claimRequests || []).map((request) => ({
      id: cleanString(request.id, 120),
      userId: cleanString(request.userId, 80),
      name: cleanString(request.name, 120),
      company: cleanString(request.company, 120),
      logoUrl: cleanString(request.logoUrl, 280),
      status: cleanString(request.status || "pickup_requested", 40),
      requestedAt: cleanString(request.requestedAt, 40),
      updatedAt: cleanString(request.updatedAt || request.requestedAt, 40),
      amount: Number(request.amount || load.rate || 0) || 0,
      note: cleanString(request.note || "", 400),
    }));
  } else {
    const ownBid = (load.claimRequests || []).find(
      (request) => request.userId === account?.userId,
    );
    if (ownBid) {
      record.myBid = {
        id: cleanString(ownBid.id, 120),
        amount: Number(ownBid.amount || load.rate || 0) || 0,
        note: cleanString(ownBid.note || "", 400),
        status: cleanString(ownBid.status || "pending", 40),
        requestedAt: cleanString(ownBid.requestedAt, 40),
        updatedAt: cleanString(ownBid.updatedAt || ownBid.requestedAt, 40),
      };
    }
    delete record.claimRequests;
    delete record.acceptedByUserId;
    delete record.acceptedAt;
  }
  // The on-site contact phone stays private until the poster accepts a
  // carrier: only the poster and the accepted carrier can see it.
  const isAcceptedCarrier =
    Boolean(account?.userId) && load.acceptedByUserId === account.userId;
  if (!isOwner && !isAcceptedCarrier) {
    delete record.contactPhone;
  }
  // Reports are moderation evidence — never expose reporter identities.
  delete record.reports;
  if (!isOwner) delete record.reportCount;
  return record;
}

// Equipment TYPE is decided before equipment FEATURES. "53 ft Dry Van w/
// liftgate" is a dry van that happens to have a liftgate — not a box truck.
// The liftgate/ramp facts are carried separately on load.lift and load.ramp,
// so carriers can filter on them without the type being wrong.
function equipmentKind(value = "") {
  const text = String(value).toLowerCase();
  // Specific trailer and truck types first.
  if (/car carrier|auto transport|car hauler/.test(text)) return "carcarrier";
  if (/truck \+ trailer|hot ?shot/.test(text)) return "trucktrailer";
  if (/lowboy|low boy|rgn|removable gooseneck/.test(text)) return "lowboy";
  if (/step ?deck|drop ?deck/.test(text)) return "stepdeck";
  if (/conestoga/.test(text)) return "conestoga";
  if (/reefer|refrigerated|temp ?control/.test(text)) return "reefer";
  if (/flatbed|flat ?deck/.test(text)) return "flatbed";
  if (/dry ?van|53 ?ft van|48 ?ft van/.test(text)) return "dryvan";
  if (/power ?only|drop ?and ?hook|drop ?& ?hook/.test(text)) return "poweronly";
  if (/cargo van|sprinter/.test(text)) return "van";
  if (/box ?truck|\bbox\b|straight truck|\d+ ?(ft|foot|')/.test(text)) return "box";
  // Feature-only descriptions fall back to a box truck, which is what a bare
  // "liftgate" or "ramp" almost always means on a commercial move.
  if (/liftgate|lift ?gate|ramp/.test(text)) return "box";
  return "other";
}

function postedLoadFromBody(body, account, photos = []) {
  const from = cleanString(body.from || body.pickupCity || "", 120);
  const to = cleanString(body.to || body.deliveryCity || "", 120);
  const pickupDate = cleanString(body.pickupDate || "", 20);
  const pickupTime = cleanString(body.pickupTime || "", 20);
  const deliveryDate = cleanString(body.deliveryDate || "", 20);
  const eq = cleanString(body.equipment || "", 120);
  const wt = cleanString(body.weight || "", 80);
  const pricingModeRaw = cleanString(body.pricingMode || "target", 20).toLowerCase();
  const pricingMode = pricingModeRaw === "open_bids" ? "open_bids" : "target";
  const rate = Number(body.rate || 0);
  const mi = Number(body.miles || 0);
  const commodity = cleanString(body.commodity || "", 160);
  const dimensions = cleanString(body.dimensions || "", 120);
  const loadingHelp = cleanString(body.loadingHelp || "", 120);
  const siteConditions = cleanString(body.siteConditions || "", 200);
  const contactName = cleanString(body.contactName || "", 120);
  const contactPhone = cleanString(body.contactPhone || "", 40);
  const jobType = cleanString(body.jobType || "", 40);
  const rateIncludesHint = cleanString(
    body.rateIncludesHint || body.rate_terms || "",
    400,
  );
  const declaredValue = Number(body.declaredValue || 0) || 0;
  if (!from || !to || !pickupDate || !pickupTime || !eq || !wt) {
    return {
      error:
        "Pickup, delivery, pickup date/time, equipment, and weight are required.",
    };
  }
  if (pricingMode === "target") {
    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        error:
          "Enter a valid target rate, or switch pricing to open for bids.",
      };
    }
  } else if (!Number.isFinite(rate) || rate < 0) {
    return { error: "Rate must be a valid number when provided." };
  }
  if (
    !commodity ||
    !dimensions ||
    !loadingHelp ||
    !siteConditions ||
    !contactName ||
    !contactPhone
  ) {
    return {
      error:
        "Carriers need the full picture: what is being moved, dimensions, loading help, site conditions, and an on-site contact name and phone are required.",
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
        rate: pricingMode === "open_bids" ? (Number.isFinite(rate) && rate > 0 ? rate : 0) : rate,
        pricingMode,
        jobType,
        rateIncludesHint,
        mi: Number.isFinite(mi) && mi > 0 ? Math.round(mi) : 0,
        wt,
        eq,
        kind: equipmentKind(eq),
        quick: Boolean(body.quickPay),
        lift: /liftgate/i.test(eq),
        ramp: /ramp/i.test(eq),
        broker: cleanString(
          account.company || account.name || "Member",
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
          pricingMode === "open_bids" ? "Open for bids" : "Target rate",
        ].filter(Boolean),
        photos,
        autoMode: cleanString(body.autoMode || "", 80),
        status: "open",
        createdAt,
        expiresAt,
        lastConfirmedAt: memberSuppliedConfirmationTimestamp(
          body.lastConfirmedAt,
          createdAt,
        ),
        confirmedAt: memberSuppliedConfirmationTimestamp(
          body.confirmedAt,
          createdAt,
        ),
        verificationStatus: memberSuppliedVerificationStatus(
          body.verificationStatus,
        ),
        paymentTerms: cleanString(body.paymentTerms || body.pay || "", 120),
        commodity,
        dimensions,
        loadingHelp,
        siteConditions,
        contactName,
        contactPhone,
        declaredValue,
        dock: Object.prototype.hasOwnProperty.call(body, "dock")
          ? Boolean(body.dock)
          : null,
        forklift: Object.prototype.hasOwnProperty.call(body, "forklift")
          ? Boolean(body.forklift)
          : null,
        postedByUserId: account.userId,
        postedByLogoUrl: cleanString(account.logoUrl || account.avatarUrl || "", 280),
        priority: posterPriorityRank(account),
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

    const url = new URL(context.request.url);
    const loadId = cleanString(url.searchParams.get("loadId") || "", 120);
    const photoId = cleanString(url.searchParams.get("photoId") || "", 120);
    const scope = cleanString(url.searchParams.get("scope") || "", 40)
      .trim()
      .toLowerCase();
    const postedScope = scope === "posted";
    const decision = carrierLoadBookingDecision(access.account);
    if (photoId) {
      if (!loadId) return json({ ok: false, error: "Load ID is required." }, 400);
      const photoLoads = await readMarketplaceLoads(context.env);
      const photoLoad = photoLoads.find((item) => item.id === loadId);
      if (!photoLoad) return json({ ok: false, error: "Load not found." }, 404);
      const isOwner = photoLoad.postedByUserId === access.account.userId;
      const isAcceptedCarrier = photoLoad.acceptedByUserId === access.account.userId;
      const mayReviewOpenLoad = photoLoad.status === "open" && decision.allowed;
      if (!isOwner && !isAcceptedCarrier && !mayReviewOpenLoad) {
        return json({ ok: false, error: "Photo access is unavailable." }, 403);
      }
      const metadata = (photoLoad.photos || []).find((photo) => photo.id === photoId);
      if (!metadata) return json({ ok: false, error: "Photo not found." }, 404);
      const dataUrl = await context.env?.RELOCATION_MANAGER_LEADS?.get(
        loadPhotoKey(photoLoad.id, metadata.id),
      );
      if (!dataUrl) return json({ ok: false, error: "Photo not found." }, 404);
      return storedPhotoResponse(dataUrl, metadata.type);
    }
    if (postedScope && !accountCanPostLoads(access.account)) {
      return json(
        { ok: false, error: "Your plan does not include load posting." },
        403,
      );
    }
    // Paid carrier members may browse/search the board while identity or
    // insurance review is still pending. Booking remains protected below in
    // the POST bid/claim path by the full carrierLoadBookingDecision gate.
    const mayBrowseWhileVerificationPending =
      decision.route === "carrier-verification";
    if (
      !postedScope &&
      !decision.allowed &&
      !mayBrowseWhileVerificationPending
    ) {
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
      if (postedScope) return item.postedByUserId === access.account.userId;
      return item.status === "open" &&
        (!Number.isFinite(expiresAt) || expiresAt > now);
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
    // Priority placement: higher-rank posters first, newest first within rank.
    loads.sort(
      (a, b) =>
        (Number(b.priority || 0) - Number(a.priority || 0)) ||
        ((Date.parse(b.createdAt || "") || 0) -
          (Date.parse(a.createdAt || "") || 0)),
    );
    loads = loads.slice(0, limit);

    if (loadId) {
      const load = loads[0] || null;
      if (!load) return json({ ok: false, error: "Load not found." }, 404);
      if (!postedScope && load.postedByUserId !== access.account.userId) {
        await recordLoadHistory(context.env, {
          id: `${load.id}:viewed:${access.account.userId}`,
          userId: access.account.userId,
          loadId: load.id,
          eventType: "viewed",
          role: "viewer",
          status: "viewed",
          title: `${load.from} → ${load.to}`,
          origin: load.from,
          destination: load.to,
          equipment: load.eq,
          counterpartyName: load.broker,
          rate: load.rate,
          occurredAt: new Date().toISOString(),
          verified: false,
          detail: "Load details viewed while signed in.",
        });
      }
      const visibleLoad = visibleLoadRecord(load, access.account);
      return json({
        ok: true,
        load: visibleLoad,
        loads: [visibleLoad],
        count: 1,
        loadCount,
        bookingAccess: decision,
        route: "loads",
      });
    }

    return json({
      ok: true,
      loads: loads.map((load) => visibleLoadRecord(load, access.account)),
      count: loads.length,
      loadCount,
      bookingAccess: decision,
      route: "loads",
    });
  } catch (error) {
    logFailure("loads.get", error);
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
      const photoInput = normalizedLoadPhotoInput(body.photos);
      if (photoInput.error) return json({ ok: false, error: photoInput.error }, 400);
      const created = postedLoadFromBody(
        body,
        access.account,
        photoInput.metadata,
      );
      if (created.error) return json({ ok: false, error: created.error }, 400);
      let loads = await readMarketplaceLoads(context.env);

      // Drop stale posts: open loads whose expiry passed more than 30 days ago.
      const staleCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const isFresh = (item) => {
        if (item.status !== "open") return true;
        const expiresAt = Date.parse(item.expiresAt || "");
        return !Number.isFinite(expiresAt) || expiresAt > staleCutoff;
      };
      const staleLoads = loads.filter((item) => !isFresh(item));
      loads = loads.filter(isFresh);

      // Reject near-identical duplicates: same poster, same lane, same pickup day.
      const newPickupDay = String(created.load.pickupAt || "").slice(0, 10);
      const laneKey = (value) => String(value || "").trim().toLowerCase();
      const duplicate = loads.find((item) => {
        if (item.postedByUserId !== access.account.userId) return false;
        if (item.status !== "open") return false;
        const expiresAt = Date.parse(item.expiresAt || "");
        if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return false;
        return (
          laneKey(item.from) === laneKey(created.load.from) &&
          laneKey(item.to) === laneKey(created.load.to) &&
          String(item.pickupAt || "").slice(0, 10) === newPickupDay
        );
      });
      if (duplicate) {
        return json(
          {
            ok: false,
            error:
              "You already have an open post for this pickup, lane, and date. Edit or remove the existing post instead of posting it again.",
            duplicateLoadId: duplicate.id,
          },
          409,
        );
      }

      const storedPhotoKeys = [];
      try {
        for (const photo of photoInput.items) {
          const key = loadPhotoKey(created.load.id, photo.metadata.id);
          await context.env.RELOCATION_MANAGER_LEADS.put(key, photo.dataUrl);
          storedPhotoKeys.push(key);
        }
        loads.unshift(created.load);
        await writeMarketplaceLoads(context.env, loads);
        // Only remove stale photo bodies after the catalog no longer
        // references those loads. A validation or catalog-write failure must
        // leave the prior snapshot and every referenced photo intact.
        await deleteLoadPhotos(context.env, staleLoads);
      } catch (error) {
        for (const key of storedPhotoKeys) {
          await context.env.RELOCATION_MANAGER_LEADS.delete(key).catch(() => {});
        }
        throw error;
      }
      await recordLoadHistory(context.env, {
        id: `${created.load.id}:posted:${access.account.userId}`,
        userId: access.account.userId,
        loadId: created.load.id,
        eventType: "posted",
        role: "poster",
        status: "open",
        title: `${created.load.from} → ${created.load.to}`,
        origin: created.load.from,
        destination: created.load.to,
        equipment: created.load.eq,
        rate: created.load.rate,
        occurredAt: created.load.createdAt,
        verified: false,
        detail: "Load posted to the member board.",
      });
      await sendMarketplaceEmail(context.env, {
        to: access.account.email,
        subject: `Pickup posted: ${created.load.from} → ${created.load.to}`,
        headline: "Your pickup is live on the board",
        bodyLines: [
          `Lane: ${created.load.from} → ${created.load.to}`,
          `Pickup: ${created.load.pick}`,
          created.load.pricingMode === "open_bids"
            ? `Equipment: ${created.load.eq} · Open for bids`
            : `Equipment: ${created.load.eq} · Target rate: $${created.load.rate}`,
          "Eligible carriers can now bid on this pickup. You will get a confirmation when a bid arrives, and your on-site contact phone stays hidden until you accept a carrier.",
        ],
        ctaLabel: "Open bid room",
        ctaUrl: "https://relocationmanagerusa.com/member.html#bid-room",
        requestId: `posted-${created.load.id}`,
      });
      return json(
        {
          ok: true,
          message: "Load posted.",
          load: created.load,
          route: "bid-room",
        },
        201,
      );
    }

    if (action === "report") {
      const reportLoadId = cleanString(body.loadId || body.id || "", 120);
      const reason = cleanString(body.reason || "", 200);
      const reportDetail = cleanString(body.detail || "", 1000);
      if (!reportLoadId || !reason) {
        return json(
          { ok: false, error: "A load and a reason are required to report." },
          400,
        );
      }
      const allLoads = await readMarketplaceLoads(context.env);
      const reported = allLoads.find((item) => item.id === reportLoadId);
      if (!reported) return json({ ok: false, error: "Load not found." }, 404);
      const alreadyReported = (reported.reports || []).some(
        (item) => item.userId === access.account.userId,
      );
      if (!alreadyReported) {
        reported.reports = [
          {
            id: `report_${crypto.randomUUID().replace(/-/g, "")}`,
            userId: access.account.userId,
            name: cleanString(access.account.name || "", 120),
            company: cleanString(access.account.company || "", 120),
            reason,
            detail: reportDetail,
            reportedAt: new Date().toISOString(),
          },
          ...(reported.reports || []),
        ].slice(0, 50);
        reported.reportCount = (Number(reported.reportCount || 0) || 0) + 1;
        // Three independent reports pull the load off the board for review.
        if (reported.reportCount >= 3 && reported.status === "open") {
          reported.status = "under_review";
        }
        await writeMarketplaceLoads(context.env, allLoads);
        await recordLoadHistory(context.env, {
          id: `${reported.id}:reported:${access.account.userId}`,
          userId: access.account.userId,
          loadId: reported.id,
          eventType: "reported",
          role: "reporter",
          status: reported.status,
          title: `${reported.from} → ${reported.to}`,
          origin: reported.from,
          destination: reported.to,
          equipment: reported.eq,
          counterpartyName: reported.broker,
          rate: reported.rate,
          occurredAt: new Date().toISOString(),
          verified: false,
          detail: `Reported: ${reason}${reportDetail ? ` — ${reportDetail}` : ""}`.slice(
            0,
            500,
          ),
        });
      }
      return json({
        ok: true,
        message:
          "Report received. The load is preserved as evidence and will be reviewed.",
        underReview: reported.status === "under_review",
      });
    }

    if (action === "decline") {
      if (!accountCanPostLoads(access.account)) {
        return json({ ok: false, error: "Your plan does not include load posting." }, 403);
      }
      const loadId = cleanString(body.loadId || body.id || "", 120);
      const requestId = cleanString(body.requestId || "", 120);
      const loads = await readMarketplaceLoads(context.env);
      const load = loads.find((item) => item.id === loadId);
      if (!load) return json({ ok: false, error: "Load not found." }, 404);
      if (load.postedByUserId !== access.account.userId) {
        return json({ ok: false, error: "Only the posting account can decline a bid." }, 403);
      }
      if (load.status !== "open") {
        return json({ ok: false, error: "This load is no longer open." }, 409);
      }
      const bid = (load.claimRequests || []).find((item) => item.id === requestId);
      if (!bid) return json({ ok: false, error: "Bid not found." }, 404);
      if (["accepted", "not_selected"].includes(bid.status)) {
        return json({ ok: false, error: "This bid can no longer be declined." }, 409);
      }
      const declinedAt = new Date().toISOString();
      bid.status = "declined";
      bid.updatedAt = declinedAt;
      await writeMarketplaceLoads(context.env, loads);
      await recordLoadHistory(context.env, {
        id: `${load.id}:bid_declined:${bid.userId}:${declinedAt}`,
        userId: bid.userId,
        loadId: load.id,
        eventType: "bid_declined",
        role: "carrier",
        status: "declined",
        title: `${load.from} → ${load.to}`,
        origin: load.from,
        destination: load.to,
        equipment: load.eq,
        counterpartyName: load.broker,
        rate: Number(bid.amount || load.rate || 0),
        occurredAt: declinedAt,
        verified: true,
        detail: "The posting shipper declined this bid.",
      });
      return json({
        ok: true,
        message: "Bid declined. The load remains open.",
        load: visibleLoadRecord(load, access.account),
      });
    }

    if (action === "accept") {
      if (!accountCanPostLoads(access.account)) {
        return json(
          { ok: false, error: "Your plan does not include load posting." },
          403,
        );
      }
      const loadId = cleanString(body.loadId || body.id || "", 120);
      const requestId = cleanString(body.requestId || "", 120);
      const requesterUserId = cleanString(body.requesterUserId || "", 80);
      const loads = await readMarketplaceLoads(context.env);
      const load = loads.find((item) => item.id === loadId);
      if (!load) return json({ ok: false, error: "Load not found." }, 404);
      if (load.postedByUserId !== access.account.userId) {
        return json(
          {
            ok: false,
            error: "Only the posting account can accept a pickup request.",
          },
          403,
        );
      }
      const pickupRequest = (load.claimRequests || []).find(
        (item) =>
          (requestId && item.id === requestId) ||
          (requesterUserId && item.userId === requesterUserId),
      );
      if (!pickupRequest) {
        return json({ ok: false, error: "Bid not found." }, 404);
      }
      if (load.status !== "open") {
        if (
          load.status === "accepted" &&
          load.acceptedRequestId === pickupRequest.id
        ) {
          const acceptedCarrier = await readAccountByUserId(
            context.env,
            pickupRequest.userId,
          );
          const activePickup = Array.isArray(acceptedCarrier?.activePickups)
            ? acceptedCarrier.activePickups.find(
                (item) =>
                  String(item?.loadId || item?.id || "") === load.id &&
                  item?.serverAuthorized === true,
              ) || null
            : null;
          try {
            await writeMarketplaceLoads(context.env, loads);
          } catch (error) {
            // D1 is authoritative. A later read can retry the KV mirror.
            logFailure("loads.mirrorAlreadyAccepted", error, { loadId: load.id });
          }
          return json({
            ok: true,
            message: `Bid was already accepted at $${load.agreedRate || pickupRequest.amount || load.rate}.`,
            load: visibleLoadRecord(load, access.account),
            activePickup,
            route: "profile",
          });
        }
        return json({ ok: false, error: "This load is no longer open." }, 409);
      }
      if (["declined", "accepted", "not_selected"].includes(pickupRequest.status)) {
        return json({ ok: false, error: "This bid is no longer available." }, 409);
      }
      const carrier = await readAccountByUserId(
        context.env,
        pickupRequest.userId,
      );
      const carrierDecision = carrier
        ? carrierLoadBookingDecision(carrier)
        : { allowed: false };
      if (!carrier || !isEntitled(carrier) || !carrierDecision.allowed) {
        return json(
          { ok: false, error: "The requesting carrier is no longer eligible." },
          409,
        );
      }
      const planLimit = planConcurrencyLimit(carrier);
      const activeCount = activeAuthorizedPickupCount(carrier, load.id);
      if (planLimit <= 0 || activeCount >= planLimit) {
        return json(
          {
            ok: false,
            error: "This carrier no longer has an open truck slot for the pickup.",
            reason: "plan_concurrency_limit",
          },
          409,
        );
      }

      const acceptedAt = new Date().toISOString();
      const agreedRate = Number(pickupRequest.amount || load.rate || 0) || load.rate;
      const activePickups = Array.isArray(carrier.activePickups)
        ? carrier.activePickups.slice()
        : [];
      const pickupIndex = activePickups.findIndex(
        (item) => String(item?.loadId || item?.id || "") === load.id,
      );
      const existingPickup = pickupIndex >= 0 ? activePickups[pickupIndex] : {};
      const acceptedPickup = {
        ...existingPickup,
        id: load.id,
        loadId: load.id,
        title: `${load.from} → ${load.to}`,
        origin: load.from,
        destination: load.to,
        equipment: load.eq,
        broker: load.broker,
        status: "Confirmed",
        pickupWindow: load.pick,
        detail: `${load.eq} · ${load.pick}`,
        rate: agreedRate,
        postedRate: load.rate,
        statusHistory: [
          ...(Array.isArray(existingPickup.statusHistory)
            ? existingPickup.statusHistory
            : []),
          { status: "Confirmed", at: acceptedAt },
        ],
        savedAt:
          existingPickup.savedAt || pickupRequest.requestedAt || acceptedAt,
        acceptedAt,
        serverAuthorized: true,
      };
      const acceptanceCommit = await commitLoadAcceptance(context.env, {
        load,
        bidId: pickupRequest.id,
        carrier,
        shipperUserId: access.account.userId,
        agreedRate,
        acceptedAt,
        planLimit,
        pickup: acceptedPickup,
      });
      if (!acceptanceCommit.ok) {
        const capacityLost =
          acceptanceCommit.reason === "plan_concurrency_limit";
        return json(
          {
            ok: false,
            error: acceptanceCommit.unavailable
              ? "Acceptance is temporarily unavailable. No carrier was selected."
              : capacityLost
                ? "This carrier no longer has an open truck slot for the pickup."
                : "Another bid has already been accepted for this load.",
            reason: acceptanceCommit.unavailable
              ? "acceptance_transaction_unavailable"
              : acceptanceCommit.reason || "load_already_accepted",
          },
          acceptanceCommit.unavailable ? 503 : 409,
        );
      }
      load.status = "accepted";
      load.acceptedByUserId = carrier.userId;
      load.acceptedAt = acceptedAt;
      load.acceptedRequestId = pickupRequest.id;
      load.agreedRate = agreedRate;
      load.claimRequests = (load.claimRequests || []).map((item) => ({
        ...item,
        status: item.id === pickupRequest.id ? "accepted" : "not_selected",
      }));
      try {
        await writeMarketplaceLoads(context.env, loads);
      } catch (error) {
        logFailure("loads.mirrorAcceptance", error, { loadId: load.id });
        // D1 commits the load and carrier slot atomically. KV is a repairable
        // compatibility mirror and must not turn a committed acceptance into
        // an error that invites the shipper to accept another carrier.
      }

      if (acceptanceCommit.alreadyCommitted) {
        return json({
          ok: true,
          message: `Bid was already accepted at $${agreedRate}.`,
          load: visibleLoadRecord(load, access.account),
          activePickup: acceptedPickup,
          route: "profile",
        });
      }
      for (const declinedRequest of load.claimRequests.filter(
        (item) => item.status === "not_selected",
      )) {
        try {
          const declinedCarrier = await readAccountByUserId(
            context.env,
            declinedRequest.userId,
          );
          if (!declinedCarrier) continue;
          const declinedPickups = Array.isArray(declinedCarrier.activePickups)
            ? declinedCarrier.activePickups.slice()
            : [];
          const declinedIndex = declinedPickups.findIndex(
            (item) => String(item?.loadId || item?.id || "") === load.id,
          );
          if (declinedIndex < 0) continue;
          const declinedPickup = declinedPickups[declinedIndex];
          declinedPickups[declinedIndex] = {
            ...declinedPickup,
            status: "Not selected",
            statusHistory: [
              ...(Array.isArray(declinedPickup.statusHistory)
                ? declinedPickup.statusHistory
                : []),
              { status: "Not selected", at: acceptedAt },
            ],
            updatedAt: acceptedAt,
            serverAuthorized: true,
          };
          await upsertAccount(context.env, {
            ...declinedCarrier,
            activePickups: declinedPickups.slice(0, 20),
            updatedAt: acceptedAt,
          });
        } catch {
          // Acceptance remains authoritative; stale compatibility records can
          // be reconciled without reopening the load.
        }
      }

      const commonHistory = {
        loadId: load.id,
        eventType: "accepted",
        status: "accepted",
        title: `${load.from} → ${load.to}`,
        origin: load.from,
        destination: load.to,
        equipment: load.eq,
        rate: agreedRate,
        occurredAt: acceptedAt,
        verified: true,
      };
      await recordLoadHistory(context.env, {
        ...commonHistory,
        id: `${load.id}:accepted:${access.account.userId}`,
        userId: access.account.userId,
        role: "poster",
        counterpartyName: carrier.company || carrier.name,
        detail: `Bid accepted by the posting shipper at $${agreedRate}.`,
      });
      await recordLoadHistory(context.env, {
        ...commonHistory,
        id: `${load.id}:accepted:${carrier.userId}`,
        userId: carrier.userId,
        role: "carrier",
        counterpartyName: access.account.company || access.account.name,
        detail: `Bid accepted by the posting shipper at $${agreedRate}.`,
      });
      await sendMarketplaceEmail(context.env, {
        to: carrier.email || "",
        subject: `Accepted: ${load.from} → ${load.to}`,
        headline: "Your pickup request was accepted",
        bodyLines: [
          `${cleanString(load.broker || "The posting member", 120)} accepted your $${agreedRate} bid for ${load.from} → ${load.to}.`,
          `Pickup: ${load.pick} · Equipment: ${load.eq}`,
          load.contactName
            ? `On-site contact: ${load.contactName}${load.contactPhone ? ` · ${load.contactPhone}` : ""}`
            : "Open the load in your workbench for the on-site contact details.",
          "Confirm the freight, site conditions, and payment terms before rolling. Keep all communication on-platform so your work history stays verified.",
        ],
        ctaLabel: "Open the load",
        ctaUrl: "https://relocationmanagerusa.com/member.html#workbench",
        requestId: `accepted-${load.id}-${carrier.userId}`,
      });
      await sendMarketplaceEmail(context.env, {
        to: access.account.email || "",
        subject: `You accepted a carrier: ${load.from} → ${load.to}`,
        headline: "Carrier confirmed for your pickup",
        bodyLines: [
          `You accepted ${cleanString(carrier.company || carrier.name || "a carrier", 120)} at $${agreedRate} for ${load.from} → ${load.to}.`,
          "They now have your on-site contact details. You can message them from your workbench.",
        ],
        ctaLabel: "Open your workbench",
        ctaUrl: "https://relocationmanagerusa.com/member.html#workbench",
        requestId: `accept-confirm-${load.id}`,
      });
      return json({
        ok: true,
        message: `Bid accepted at $${agreedRate}.`,
        load: visibleLoadRecord(load, access.account),
        activePickup: acceptedPickup,
        route: "profile",
      });
    }

    if (!["bid", "claim"].includes(action))
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

    if (action === "claim") {
      const openForBids =
        String(load.pricingMode || "").toLowerCase() === "open_bids" ||
        !(Number(load.rate || 0) > 0);
      if (openForBids) {
        return json(
          {
            ok: false,
            error:
              "This pickup is open for bids. Submit an all-in bid and say what the price includes.",
          },
          400,
        );
      }
      const duplicate = (load.claimRequests || []).some(
        (request) => request.userId === access.account.userId,
      );
      let activePickup = Array.isArray(access.account.activePickups)
        ? access.account.activePickups.find(
            (item) =>
              item?.serverAuthorized === true &&
              String(item?.loadId || item?.id || "") === load.id,
          ) || null
        : null;
      if (!duplicate) {
        const planLimit = planConcurrencyLimit(access.account);
        const activeCount = activeAuthorizedPickupCount(access.account);
        if (planLimit > 0 && activeCount >= planLimit) {
          return json(
            {
              ok: false,
              error:
                planLimit === 1
                  ? "Your plan covers 1 truck and it already has an active pickup. Complete or cancel it first — or upgrade your plan to run more than one load at a time."
                  : `Your plan covers ${planLimit} trucks and all ${planLimit} are on active pickups. Complete one first, or upgrade your plan to run more loads at once.`,
              route: "pricing",
              reason: "plan_concurrency_limit",
              activePickups: activeCount,
              planLimit,
            },
            403,
          );
        }
        const requestedAt = new Date().toISOString();
        const request = {
          id: `claim_${crypto.randomUUID().replace(/-/g, "")}`,
          userId: access.account.userId,
          name: cleanString(access.account.name || "", 120),
          company: cleanString(access.account.company || "", 120),
          logoUrl: cleanString(
            access.account.logoUrl || access.account.avatarUrl || "",
            280,
          ),
          amount: Number(load.rate || 0),
          note: "Carrier accepted the posted target rate.",
          status: "pickup_requested",
          requestedAt,
          updatedAt: requestedAt,
        };
        load.claimRequests = [request, ...(load.claimRequests || [])].slice(0, 50);
        await writeMarketplaceLoads(context.env, loads);
        await recordLoadHistory(context.env, {
          id: `${load.id}:pickup_requested:${access.account.userId}`,
          userId: access.account.userId,
          loadId: load.id,
          eventType: "pickup_requested",
          role: "carrier",
          status: "pickup_requested",
          title: `${load.from} → ${load.to}`,
          origin: load.from,
          destination: load.to,
          equipment: load.eq,
          counterpartyName: load.broker,
          rate: load.rate,
          occurredAt: requestedAt,
          verified: false,
          detail: "Pickup request sent at the posted target rate.",
        });
        const activePickups = Array.isArray(access.account.activePickups)
          ? access.account.activePickups.filter(
              (item) => String(item?.loadId || item?.id || "") !== load.id,
            )
          : [];
        activePickup = {
          id: load.id,
          loadId: load.id,
          title: `${load.from} → ${load.to}`,
          origin: load.from,
          destination: load.to,
          equipment: load.eq,
          broker: load.broker,
          status: "Pickup requested",
          pickupWindow: load.pick,
          detail: `${load.eq} · ${load.pick}`,
          statusHistory: [{ status: "Pickup requested", at: requestedAt }],
          savedAt: requestedAt,
          serverAuthorized: true,
        };
        activePickups.unshift(activePickup);
        await upsertAccount(context.env, {
          ...access.account,
          activePickups: activePickups.slice(0, 20),
          updatedAt: requestedAt,
        });
      }
      return json({
        ok: true,
        message: duplicate ? "Pickup already requested." : "Pickup request sent.",
        load: visibleLoadRecord(load, access.account),
        claimedLoad: visibleLoadRecord(load, access.account),
        activePickup,
        bookingAccess: decision,
        route: "loads",
      });
    }

    const amount = Number(body.amount || 0);
    const note = cleanString(body.note || "", 400);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return json({ ok: false, error: "Enter a valid all-in bid amount." }, 400);
    }
    if (note.length < 12) {
      return json(
        {
          ok: false,
          error:
            "Say what your all-in price includes (equipment, labor, wait time, tolls) — at least a short note.",
        },
        400,
      );
    }
    const now = new Date().toISOString();
    const existingBid = (load.claimRequests || []).find(
      (request) => request.userId === access.account.userId,
    );
    let bid;
    if (existingBid) {
      if (["accepted", "not_selected"].includes(existingBid.status)) {
        return json({ ok: false, error: "This bid can no longer be changed." }, 409);
      }
      existingBid.amount = amount;
      existingBid.note = note;
      existingBid.status = "pending";
      existingBid.updatedAt = now;
      bid = existingBid;
    } else {
      bid = {
        id: `bid_${crypto.randomUUID().replace(/-/g, "")}`,
        userId: access.account.userId,
        name: cleanString(access.account.name || "", 120),
        company: cleanString(access.account.company || "", 120),
        logoUrl: cleanString(
          access.account.logoUrl || access.account.avatarUrl || "",
          280,
        ),
        amount,
        note,
        status: "pending",
        requestedAt: now,
        updatedAt: now,
      };
      load.claimRequests = [bid, ...(load.claimRequests || [])].slice(0, 50);
    }
    await writeMarketplaceLoads(context.env, loads);
    await recordLoadHistory(context.env, {
      id: `${load.id}:bid_submitted:${access.account.userId}:${now}`,
      userId: access.account.userId,
      loadId: load.id,
      eventType: "bid_submitted",
      role: "carrier",
      status: "pending",
      title: `${load.from} → ${load.to}`,
      origin: load.from,
      destination: load.to,
      equipment: load.eq,
      counterpartyName: load.broker,
      rate: amount,
      occurredAt: now,
      verified: false,
      detail: existingBid ? "Bid revised and sent to the posting shipper." : "Bid sent to the posting shipper.",
    });
    const poster = await readAccountByUserId(
      context.env,
      load.postedByUserId,
    ).catch(() => null);
    await sendMarketplaceEmail(context.env, {
      to: poster?.email || "",
      subject: `$${amount} bid: ${load.from} → ${load.to}`,
      headline: existingBid ? "A carrier revised a bid" : "A carrier bid on your load",
      bodyLines: [
        `${cleanString(access.account.company || access.account.name || "A carrier", 120)} offered $${amount} for ${load.from} → ${load.to}.`,
        note ? `Carrier note: ${note}` : "No additional bid note was supplied.",
        "Review the carrier and bid, then accept or decline it from your bid room. Your on-site contact phone stays hidden until you accept.",
      ],
      ctaLabel: "Open bid room",
      ctaUrl: "https://relocationmanagerusa.com/member.html#bid-room",
      requestId: `bid-${load.id}-${access.account.userId}-${now}`,
    });

    return json({
      ok: true,
      message: existingBid ? "Bid updated." : "Bid submitted.",
      load: visibleLoadRecord(load, access.account),
      claimedLoad: visibleLoadRecord(load, access.account),
      bid: visibleLoadRecord(load, access.account).myBid,
      bookingAccess: decision,
      route: "loads",
    });
  } catch (error) {
    logFailure("loads.post", error);
    return json({ ok: false, error: "Load action failed." }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
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
