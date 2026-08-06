const MAX_LOADS = 100;

export function normalizeDispatchInput(body = {}) {
  const input = {
    goal: clean(body.goal || "find_loads", 30).toLowerCase(),
    origin: clean(body.origin, 120),
    destination: clean(body.destination || "Anywhere", 120),
    equipment: clean(body.equipment || "Any", 120),
    availableDates: clean(body.availableDates || "Any", 100),
    maxDeadheadMiles: boundedNumber(body.maxDeadheadMiles, 0, 500),
    minimumRatePerMile: boundedNumber(body.minimumRatePerMile, 0, 25),
    notes: clean(body.notes, 500),
  };

  if (!input.origin) return { error: "Enter a current or pickup location." };
  if (!input.destination) input.destination = "Anywhere";
  if (!input.equipment) input.equipment = "Any";
  return { input };
}

export function normalizeMarketplaceLoads(loads = []) {
  return (Array.isArray(loads) ? loads : [])
    .slice(0, MAX_LOADS)
    .map((load, index) => ({
      id: clean(load.id || `load-${index}`, 120),
      from: clean(load.from || load.origin, 120),
      to: clean(load.to || load.destination, 120),
      rate: boundedNumber(load.rate, 0, 1000000),
      mi: boundedNumber(load.mi || load.miles, 0, 10000),
      pick: clean(load.pick || load.pickupAt, 120),
      wt: clean(load.wt || load.weight, 80),
      eq: clean(load.eq || load.equipment, 120),
      kind: clean(load.kind, 40).toLowerCase(),
      quick: Boolean(load.quick),
      broker: clean(load.broker, 120),
      trust: boundedNumber(load.trust, 0, 100),
      insurance: clean(load.insurance, 60),
      status: clean(load.status || "open", 30).toLowerCase(),
      expiresAt: clean(load.expiresAt, 80),
    }))
    .filter((load) => load.id && load.from && load.to);
}

export function rankDispatchLoads(loads = [], input = {}, limit = 5) {
  const now = Date.now();
  return normalizeMarketplaceLoads(loads)
    .filter((load) => {
      const expiresAt = Date.parse(load.expiresAt || "");
      return (
        load.status === "open" &&
        (!Number.isFinite(expiresAt) || expiresAt > now) &&
        (load.trust >= 85 || /verified/i.test(load.insurance))
      );
    })
    .map((load) => scoreLoad(load, input))
    .filter((load) => load.score >= 25)
    .sort((a, b) => b.score - a.score || b.ratePerMile - a.ratePerMile)
    .slice(0, Math.max(1, Math.min(10, Number(limit) || 5)));
}

export function makeLaneAlertDraft(input = {}) {
  return {
    origin: clean(input.origin, 120),
    destination: clean(input.destination || "Anywhere", 120),
    equipment: clean(input.equipment || "Any", 120),
    rate: boundedNumber(input.minimumRatePerMile, 0, 25),
    maxDeadheadMiles: boundedNumber(input.maxDeadheadMiles, 0, 500),
    availableDates: clean(input.availableDates || "Any", 100),
    preferredLanes: `${clean(input.origin, 120)} → ${clean(input.destination || "Anywhere", 120)}`,
    notificationPreferences: {
      inApp: true,
      push: true,
      email: false,
      sms: false,
    },
    source: "ai_dispatch_assistant",
  };
}

function scoreLoad(load, input) {
  let score = 0;
  const reasons = [];
  const requestedEquipment = equipmentKind(input.equipment);
  const loadEquipment = equipmentKind(load.eq || load.kind);
  const originMatch = locationMatch(input.origin, load.from);
  const destinationIsOpen = /^(any|anywhere)$/i.test(input.destination || "");
  const destinationMatch =
    destinationIsOpen || locationMatch(input.destination, load.to);
  const equipmentMatch =
    requestedEquipment === "any" || requestedEquipment === loadEquipment;
  const ratePerMile = load.mi > 0 ? load.rate / load.mi : 0;
  const rateMatch =
    !Number(input.minimumRatePerMile || 0) ||
    ratePerMile >= Number(input.minimumRatePerMile || 0);

  if (originMatch) {
    score += 30;
    reasons.push("pickup area match");
  }
  if (destinationMatch) {
    score += destinationIsOpen ? 10 : 25;
    reasons.push(destinationIsOpen ? "flexible destination" : "destination match");
  }
  if (equipmentMatch) {
    score += 30;
    reasons.push("equipment match");
  }
  if (rateMatch) {
    score += 10;
    if (ratePerMile) reasons.push(`$${ratePerMile.toFixed(2)}/mi`);
  }
  if (load.trust >= 90) {
    score += 5;
    reasons.push(`trust ${Math.round(load.trust)}`);
  }
  if (load.quick) {
    score += 3;
    reasons.push("quick-pay");
  }
  if (!equipmentMatch) score -= 35;
  if (!originMatch) score -= 15;
  if (!destinationMatch) score -= 10;
  if (!rateMatch) score -= 15;

  return {
    ...load,
    score: Math.max(0, Math.min(100, score)),
    ratePerMile: Number(ratePerMile.toFixed(2)),
    reasons,
  };
}

// Plain-language fallback for dispatch planning. This helper only describes
// data already supplied to it; it never saves, sends, publishes, or books.
export function buildDeterministicSummary(input = {}, matches = [], laneAlertDraft = null, isCarrier = true) {
  if (!isCarrier) {
    return "Here is your pickup planning checklist: describe the freight, dimensions, weight, loading help, site conditions, appointment window, and payment terms in your post. Use the Post a Load tab when ready. Nothing is posted without your approval.";
  }

  const origin = clean(input.origin || "your origin", 120);
  const destination = clean(input.destination || "Anywhere", 120);
  const equipment = clean(input.equipment || "Any", 120);
  const safeMatches = Array.isArray(matches) ? matches.slice(0, 5) : [];
  const lines = [];

  if (!safeMatches.length) {
    lines.push(
      `No open loads currently match ${origin} → ${destination} with ${equipment} equipment. That is the honest state of the board right now — no invented matches.`,
    );
  } else {
    lines.push(`Found ${safeMatches.length} real open load${safeMatches.length === 1 ? "" : "s"} worth a look (best first):`);
    safeMatches.forEach((match, index) => {
      const from = clean(match?.from || "Origin not listed", 120);
      const to = clean(match?.to || "Destination not listed", 120);
      const eq = clean(match?.eq || "Equipment not listed", 120);
      const rate = boundedNumber(match?.rate, 0, 1000000);
      const ratePerMile = boundedNumber(match?.ratePerMile, 0, 1000);
      lines.push(
        `${index + 1}. ${from} → ${to} · $${rate}${ratePerMile ? ` ($${ratePerMile}/mi)` : ""} · ${eq}`,
      );
    });
  }

  if (laneAlertDraft && typeof laneAlertDraft === "object") {
    const preferredLanes = clean(laneAlertDraft.preferredLanes, 241);
    const alertEquipment = clean(laneAlertDraft.equipment || "Any", 120);
    const alertRate = boundedNumber(laneAlertDraft.rate, 0, 25);
    if (preferredLanes) {
      lines.push(
        `Suggested Lane Alert (not saved until you approve it): ${preferredLanes}, ${alertEquipment}${alertRate ? `, min $${alertRate}/mi` : ""}.`,
      );
    }
  }

  lines.push("All figures come from your entered numbers and the posted load details. Verify every load, company, and payment independently before booking.");
  return lines.join("\n\n").slice(0, 4000);
}

function locationMatch(requested = "", actual = "") {
  const requestParts = locationParts(requested);
  const actualParts = locationParts(actual);
  if (!requestParts.length || /^(any|anywhere)$/i.test(requested)) return true;
  return requestParts.some((part) => actualParts.includes(part));
}

function locationParts(value = "") {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function equipmentKind(value = "") {
  const text = String(value).toLowerCase();
  if (!text || /^(any|all)$/.test(text)) return "any";
  if (/cargo van/.test(text)) return "cargo-van";
  if (/box|liftgate|ramp/.test(text)) return "box";
  if (/hotshot|truck \+ trailer/.test(text)) return "hotshot";
  if (/car carrier|auto transport/.test(text)) return "car-carrier";
  if (/dry van/.test(text)) return "dry-van";
  if (/reefer/.test(text)) return "reefer";
  if (/conestoga/.test(text)) return "conestoga";
  if (/step deck/.test(text)) return "step-deck";
  if (/flatbed/.test(text)) return "flatbed";
  if (/lowboy|rgn/.test(text)) return "lowboy";
  if (/power only/.test(text)) return "power-only";
  return text.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function boundedNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, number));
}
