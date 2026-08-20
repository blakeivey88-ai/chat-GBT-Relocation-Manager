/**
 * Truck seats (plan fairness) + remaining capacity (honest partials).
 * Phase 1: seat count = plan concurrent limit; bind pickups to a seat.
 * Phase 2: length/weight/cube remaining on a seat; stack partials until full;
 *          complete/empty frees capacity.
 */

export const SEAT_PRESETS = [
  {
    id: "cargo-van",
    label: "Cargo van",
    usableLengthFt: 10,
    usableWidthFt: 5.5,
    usableHeightFt: 5.5,
    maxPayloadLb: 3000,
  },
  {
    id: "hotshot",
    label: "Hot shot (deck)",
    usableLengthFt: 40,
    usableWidthFt: 8.5,
    usableHeightFt: 8,
    maxPayloadLb: 14000,
  },
  {
    id: "box-16",
    label: "16' box",
    usableLengthFt: 16,
    usableWidthFt: 7.5,
    usableHeightFt: 7,
    maxPayloadLb: 5000,
  },
  {
    id: "box-20",
    label: "20' box",
    usableLengthFt: 20,
    usableWidthFt: 8,
    usableHeightFt: 8,
    maxPayloadLb: 7000,
  },
  {
    id: "box-26",
    label: "26' box / bobtail",
    usableLengthFt: 26,
    usableWidthFt: 8,
    usableHeightFt: 8.5,
    maxPayloadLb: 10000,
  },
  {
    id: "dry-van-53",
    label: "53' dry van",
    usableLengthFt: 53,
    usableWidthFt: 8.5,
    usableHeightFt: 9,
    maxPayloadLb: 45000,
  },
  {
    id: "generic",
    label: "General equipment",
    usableLengthFt: 26,
    usableWidthFt: 8,
    usableHeightFt: 8,
    maxPayloadLb: 10000,
  },
];

const PACKING_FACTOR = 0.75;

function num(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function clean(value, max = 120) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

export function planSeatLimit(account) {
  const payment = String(account?.paymentStatus || "").toLowerCase();
  const type = String(account?.type || "").toLowerCase();
  if (payment === "paid_shipper" || /customer|pickup/.test(type)) return 0;
  if (
    payment === "paid_driver" ||
    /independent driver|owner[- ]?operator|self[- ]?insured/.test(type)
  ) {
    return 1;
  }
  if (payment === "paid_fleet_starter" || /1[-–]3/.test(type)) return 3;
  if (payment === "paid_fleet_growth" || /4[-–]7/.test(type)) return 7;
  if (payment === "paid_fleet_pro" || /[78][-–]12/.test(type)) return 12;
  if (payment === "paid_dispatcher_broker" || /dispatcher/.test(type)) return 12;
  return 1;
}

export function upgradePlanHint(planLimit) {
  if (planLimit <= 1) {
    return {
      route: "pricing",
      upgradePlan: "fleet-starter",
      upgradeLabel: "Carrier & Broker Starter ($59.99 · up to 3 truck seats)",
      message:
        "Your plan covers 1 truck seat. Complete or free capacity on that truck first — or upgrade to Carrier Starter ($59.99) for up to 3 seats.",
    };
  }
  if (planLimit <= 3) {
    return {
      route: "pricing",
      upgradePlan: "fleet-growth",
      upgradeLabel: "Carrier & Broker Growth ($79.99 · up to 7 seats)",
      message: `Your plan covers ${planLimit} truck seats and they are all in use. Complete a load or upgrade to Growth ($79.99) for more seats.`,
    };
  }
  if (planLimit <= 7) {
    return {
      route: "pricing",
      upgradePlan: "fleet-pro",
      upgradeLabel: "Carrier & Broker Pro ($149.99 · up to 12 seats)",
      message: `Your plan covers ${planLimit} truck seats and they are all in use. Complete a load or upgrade to Pro for more seats.`,
    };
  }
  return {
    route: "pricing",
    upgradePlan: "dispatcher-broker",
    upgradeLabel: "Dispatcher & Broker plan",
    message: `All ${planLimit} seats on this plan are in use. Complete a load before accepting more work.`,
  };
}

export function matchPresetFromEquipment(equipmentText = "") {
  const text = String(equipmentText || "").toLowerCase();
  if (/cargo\s*van|sprinter|transit/.test(text)) return SEAT_PRESETS.find((p) => p.id === "cargo-van");
  if (/hot\s*shot|hotshot|gooseneck|deck over/.test(text)) return SEAT_PRESETS.find((p) => p.id === "hotshot");
  if (/16\s*('|ft|foot)|16ft/.test(text)) return SEAT_PRESETS.find((p) => p.id === "box-16");
  if (/20\s*('|ft|foot)|20ft/.test(text)) return SEAT_PRESETS.find((p) => p.id === "box-20");
  if (/26\s*('|ft|foot)|26ft|bobtail|box truck/.test(text)) return SEAT_PRESETS.find((p) => p.id === "box-26");
  if (/53\s*('|ft|foot)|53ft|dry\s*van|semi|trailer/.test(text)) return SEAT_PRESETS.find((p) => p.id === "dry-van-53");
  return SEAT_PRESETS.find((p) => p.id === "generic");
}

export function isActivePickup(item) {
  if (!item || item.serverAuthorized !== true) return false;
  return !/completed|complete|delivered|declined|cancelled|canceled|not[\s_-]?selected|empty/i.test(
    String(item.status || ""),
  );
}

export function activePickupsList(account) {
  return Array.isArray(account?.activePickups) ? account.activePickups : [];
}

/** Distinct seats currently hauling (legacy rows without seatId count as their own seat via loadId). */
export function occupiedSeatKeys(account, excludeLoadId = "") {
  const keys = new Set();
  for (const item of activePickupsList(account)) {
    if (!isActivePickup(item)) continue;
    const loadId = String(item.loadId || item.id || "");
    if (excludeLoadId && loadId === excludeLoadId) continue;
    keys.add(String(item.seatId || loadId || item.id || "unknown"));
  }
  return [...keys];
}

export function occupiedSeatCount(account, excludeLoadId = "") {
  return occupiedSeatKeys(account, excludeLoadId).length;
}

export function buildDefaultSeats(account) {
  const limit = Math.max(0, planSeatLimit(account));
  const preset =
    matchPresetFromEquipment(account?.equipmentType || account?.type || "") ||
    SEAT_PRESETS.find((p) => p.id === "box-26");
  const seats = [];
  for (let i = 0; i < Math.max(limit, 1); i += 1) {
    seats.push({
      seatId: `seat_${i + 1}`,
      label: limit <= 1 ? preset.label : `${preset.label} · seat ${i + 1}`,
      presetId: preset.id,
      usableLengthFt: preset.usableLengthFt,
      usableWidthFt: preset.usableWidthFt,
      usableHeightFt: preset.usableHeightFt,
      maxPayloadLb: preset.maxPayloadLb,
      packingFactor: PACKING_FACTOR,
      status: "empty",
      active: true,
    });
  }
  return seats.slice(0, Math.max(limit, 1));
}

export function ensureTruckSeats(account) {
  const limit = planSeatLimit(account);
  let seats = Array.isArray(account?.truckSeats)
    ? account.truckSeats.map((seat, index) => normalizeSeat(seat, index))
    : [];
  seats = seats.filter((seat) => seat && seat.active !== false);
  if (!seats.length && limit > 0) {
    seats = buildDefaultSeats(account);
  }
  // Cap listed seats to plan limit (paid seats only — anti-fraud).
  if (limit > 0 && seats.length > limit) {
    seats = seats.slice(0, limit);
  }
  if (limit === 0) {
    seats = [];
  }
  return seats;
}

function normalizeSeat(seat, index = 0) {
  const preset =
    SEAT_PRESETS.find((p) => p.id === seat?.presetId) ||
    matchPresetFromEquipment(seat?.label || seat?.equipmentType || "") ||
    SEAT_PRESETS.find((p) => p.id === "generic");
  return {
    seatId: clean(seat?.seatId || `seat_${index + 1}`, 80) || `seat_${index + 1}`,
    label: clean(seat?.label || preset.label, 120) || preset.label,
    presetId: preset.id,
    usableLengthFt: num(seat?.usableLengthFt) > 0 ? num(seat.usableLengthFt) : preset.usableLengthFt,
    usableWidthFt: num(seat?.usableWidthFt) > 0 ? num(seat.usableWidthFt) : preset.usableWidthFt,
    usableHeightFt: num(seat?.usableHeightFt) > 0 ? num(seat.usableHeightFt) : preset.usableHeightFt,
    maxPayloadLb: num(seat?.maxPayloadLb) > 0 ? num(seat.maxPayloadLb) : preset.maxPayloadLb,
    packingFactor:
      num(seat?.packingFactor) > 0 && num(seat?.packingFactor) <= 1
        ? num(seat.packingFactor)
        : PACKING_FACTOR,
    status: clean(seat?.status || "empty", 40) || "empty",
    active: seat?.active === false ? false : true,
  };
}

export function seatUsableCube(seat) {
  const l = num(seat.usableLengthFt);
  const w = num(seat.usableWidthFt);
  const h = num(seat.usableHeightFt);
  const factor = num(seat.packingFactor) > 0 ? num(seat.packingFactor) : PACKING_FACTOR;
  if (!(l > 0 && w > 0 && h > 0)) return 0;
  return l * w * h * factor;
}

/** Estimate demand from a marketplace load record (honest, conservative). */
export function estimateLoadDemand(load = {}) {
  const equipment = clean(load.eq || load.equipment || "", 120);
  const weightText = load.wt || load.weight || "";
  let weightLb = num(weightText);
  if (!Number.isFinite(weightLb) || weightLb <= 0) weightLb = 0;

  // Prefer explicit length/cube if present on the load.
  let lengthFt = num(load.lengthFt || load.usableLengthFt || load.spaceFt);
  let cubeCuFt = num(load.cubeCuFt || load.volumeCuFt);

  const dims = clean(load.dimensions || load.dims || "", 160);
  // e.g. 48x40x48 in → convert to ft cube
  const dimMatch = dims.match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(in|inch|ft|')?/i,
  );
  if (dimMatch) {
    let a = Number(dimMatch[1]);
    let b = Number(dimMatch[2]);
    let c = Number(dimMatch[3]);
    const unit = String(dimMatch[4] || "in").toLowerCase();
    if (unit.startsWith("in")) {
      a /= 12;
      b /= 12;
      c /= 12;
    }
    const itemCube = a * b * c;
    if (!(cubeCuFt > 0)) cubeCuFt = itemCube;
    if (!(lengthFt > 0)) lengthFt = Math.max(a, b, c);
  }

  const textBlob = `${load.commodity || ""} ${load.notes || ""} ${load.kind || ""} ${load.tags || ""}`;
  const looksPartial = /partial|ltl|pallets?|space available|half truck|shared/i.test(textBlob);
  const looksFull =
    Boolean(load.exclusiveTruck) ||
    /full|ftl|exclusive|entire truck|whole truck|dedicated/i.test(textBlob);

  // Floor length guess if still empty — fail closed for anti-fraud (unknown ≈ full seat).
  if (!(lengthFt > 0)) {
    const preset = matchPresetFromEquipment(equipment);
    if (looksPartial) {
      lengthFt = 8;
    } else if (looksFull) {
      lengthFt = preset?.usableLengthFt || 26;
    } else {
      // No dims and no partial language: treat as exclusive truck so multi-truck
      // freeloaders cannot stack unlimited claims on a $29.99 seat.
      lengthFt = preset?.usableLengthFt || 26;
    }
  }
  if (!(cubeCuFt > 0) && lengthFt > 0) {
    cubeCuFt = lengthFt * 8 * 8 * PACKING_FACTOR;
  }
  if (!(weightLb > 0)) {
    weightLb = Math.round(lengthFt * 200); // soft default ~200 lb per foot
  }

  return {
    lengthFt: Math.round(lengthFt * 10) / 10,
    weightLb: Math.round(weightLb),
    cubeCuFt: Math.round(cubeCuFt),
    equipment,
    exclusive:
      looksFull ||
      (!looksPartial &&
        !clean(load.dimensions || load.dims || "", 160) &&
        !(num(load.lengthFt || load.spaceFt) > 0)),
  };
}

export function seatUsage(account, seatId, excludeLoadId = "") {
  let lengthFt = 0;
  let weightLb = 0;
  let cubeCuFt = 0;
  const loads = [];
  for (const item of activePickupsList(account)) {
    if (!isActivePickup(item)) continue;
    const loadId = String(item.loadId || item.id || "");
    if (excludeLoadId && loadId === excludeLoadId) continue;
    if (String(item.seatId || "") !== String(seatId)) continue;
    lengthFt += num(item.lengthFtUsed) > 0 ? num(item.lengthFtUsed) : 0;
    weightLb += num(item.weightLbUsed) > 0 ? num(item.weightLbUsed) : 0;
    cubeCuFt += num(item.cubeCuFtUsed) > 0 ? num(item.cubeCuFtUsed) : 0;
    loads.push({
      loadId: item.loadId || item.id,
      title: item.title || "",
      status: item.status || "",
      lengthFtUsed: item.lengthFtUsed,
      weightLbUsed: item.weightLbUsed,
      cubeCuFtUsed: item.cubeCuFtUsed,
    });
  }
  return { lengthFt, weightLb, cubeCuFt, loads };
}

export function seatRemaining(seat, usage) {
  const usableCube = seatUsableCube(seat);
  return {
    lengthFt: Math.max(0, num(seat.usableLengthFt) - num(usage.lengthFt)),
    weightLb: Math.max(0, num(seat.maxPayloadLb) - num(usage.weightLb)),
    cubeCuFt: Math.max(0, usableCube - num(usage.cubeCuFt)),
    usableLengthFt: num(seat.usableLengthFt),
    maxPayloadLb: num(seat.maxPayloadLb),
    usableCubeCuFt: Math.round(usableCube),
  };
}

export function demandFitsRemaining(demand, remaining) {
  if (demand?.exclusive && (remaining.lengthFt < remaining.usableLengthFt * 0.95)) {
    return { ok: false, reason: "exclusive_needs_empty_seat" };
  }
  if (demand.lengthFt > remaining.lengthFt + 0.05) {
    return { ok: false, reason: "length", need: demand.lengthFt, have: remaining.lengthFt };
  }
  if (demand.weightLb > remaining.weightLb + 1) {
    return { ok: false, reason: "weight", need: demand.weightLb, have: remaining.weightLb };
  }
  if (demand.cubeCuFt > remaining.cubeCuFt + 1) {
    return { ok: false, reason: "cube", need: demand.cubeCuFt, have: remaining.cubeCuFt };
  }
  return { ok: true };
}

/**
 * Choose a seat for a new load.
 * Prefers preferredSeatId, then a seat that already has partial room, then an empty seat under plan limit.
 */
export function pickSeatForLoad(account, load, preferredSeatId = "") {
  const seats = ensureTruckSeats(account);
  const planLimit = planSeatLimit(account);
  const demand = estimateLoadDemand(load);
  const excludeLoadId = clean(load?.id || load?.loadId || "", 120);
  const occupied = new Set(occupiedSeatKeys(account, excludeLoadId));
  const preferred = clean(preferredSeatId, 80);

  const candidates = [];
  for (const seat of seats) {
    const usage = seatUsage(account, seat.seatId, excludeLoadId);
    const remaining = seatRemaining(seat, usage);
    const fit = demandFitsRemaining(demand, remaining);
    const isOccupied = occupied.has(seat.seatId) || usage.loads.length > 0;
    candidates.push({ seat, usage, remaining, fit, isOccupied });
  }

  const tryOrder = [];
  if (preferred) {
    const hit = candidates.find((c) => c.seat.seatId === preferred);
    if (hit) tryOrder.push(hit);
  }
  // Prefer partial stack on already-used seats that fit.
  for (const c of candidates) {
    if (c.isOccupied && c.fit.ok && !tryOrder.includes(c)) tryOrder.push(c);
  }
  // Then empty seats if we still have seat budget.
  for (const c of candidates) {
    if (!c.isOccupied && c.fit.ok && !tryOrder.includes(c)) tryOrder.push(c);
  }

  for (const c of tryOrder) {
    if (!c.fit.ok) continue;
    if (!c.isOccupied && occupied.size >= planLimit) continue;
    return {
      ok: true,
      seat: c.seat,
      demand,
      remainingBefore: c.remaining,
      occupiedSeatCount: occupied.size,
      planLimit,
    };
  }

  const upgrade = upgradePlanHint(planLimit);
  // Capacity-only failure on occupied seat(s)
  const anyOccupiedFitFail = candidates.some((c) => c.isOccupied && !c.fit.ok);
  if (occupied.size >= planLimit && !candidates.some((c) => c.isOccupied && c.fit.ok)) {
    return {
      ok: false,
      reason: "plan_concurrency_limit",
      demand,
      occupiedSeatCount: occupied.size,
      planLimit,
      ...upgrade,
      error: upgrade.message,
    };
  }
  if (anyOccupiedFitFail || candidates.every((c) => !c.fit.ok)) {
    return {
      ok: false,
      reason: "capacity_full",
      demand,
      occupiedSeatCount: occupied.size,
      planLimit,
      route: "profile",
      error:
        "Not enough remaining space on your truck seat(s) for this freight (length, weight, or cube). Free capacity by completing a load, or use a larger seat/plan.",
    };
  }
  return {
    ok: false,
    reason: "plan_concurrency_limit",
    demand,
    occupiedSeatCount: occupied.size,
    planLimit,
    ...upgrade,
    error: upgrade.message,
  };
}

export function buildCapacityReport(account) {
  const seats = ensureTruckSeats(account);
  const planLimit = planSeatLimit(account);
  const occupied = occupiedSeatCount(account);
  const seatReports = seats.map((seat) => {
    const usage = seatUsage(account, seat.seatId);
    const remaining = seatRemaining(seat, usage);
    let status = "empty";
    if (usage.loads.length) {
      const lengthUsedRatio =
        remaining.usableLengthFt > 0 ? usage.lengthFt / remaining.usableLengthFt : 1;
      status =
        lengthUsedRatio >= 0.95 || remaining.lengthFt < 1 || remaining.weightLb < 50
          ? "full"
          : "partial";
    }
    return {
      ...seat,
      status,
      used: {
        lengthFt: Math.round(usage.lengthFt * 10) / 10,
        weightLb: Math.round(usage.weightLb),
        cubeCuFt: Math.round(usage.cubeCuFt),
      },
      remaining: {
        lengthFt: Math.round(remaining.lengthFt * 10) / 10,
        weightLb: Math.round(remaining.weightLb),
        cubeCuFt: Math.round(remaining.cubeCuFt),
      },
      activeLoads: usage.loads,
    };
  });
  return {
    planLimit,
    occupiedSeats: occupied,
    openSeats: Math.max(0, planLimit - occupied),
    seats: seatReports,
    summary:
      planLimit <= 0
        ? "Shipper plans do not include truck seats for claiming loads."
        : `${occupied} of ${planLimit} truck seat(s) in use. Partials can stack on a seat until length/weight/cube is full.`,
  };
}

/** Attach capacity fields onto an activePickup record. */
export function decoratePickupWithCapacity(pickup, seat, demand) {
  return {
    ...pickup,
    seatId: seat.seatId,
    seatLabel: seat.label,
    lengthFtUsed: demand.lengthFt,
    weightLbUsed: demand.weightLb,
    cubeCuFtUsed: demand.cubeCuFt,
    capacityExclusive: Boolean(demand.exclusive),
  };
}

export function markPickupTerminal(account, loadId, status = "Completed") {
  const id = String(loadId || "");
  const list = activePickupsList(account).map((item) => {
    const itemId = String(item.loadId || item.id || "");
    if (itemId !== id) return item;
    const at = new Date().toISOString();
    return {
      ...item,
      status,
      completedAt: at,
      statusHistory: [
        ...(Array.isArray(item.statusHistory) ? item.statusHistory : []),
        { status, at },
      ],
      // Zero capacity so seat frees even if status regex missed.
      lengthFtUsed: 0,
      weightLbUsed: 0,
      cubeCuFtUsed: 0,
      capacityReleased: true,
    };
  });
  return { ...account, activePickups: list, truckSeats: ensureTruckSeats(account) };
}

export {
  PACKING_FACTOR,
};
