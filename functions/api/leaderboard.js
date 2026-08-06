import {
  cleanNumber,
  cleanString,
  emailVerified,
  ensureAccountShape,
  isEntitled,
  listLeaderboardAccounts,
  publicProfile,
  readCurrentAccount,
  roleFromType,
  requireEntitledAccount,
} from './_auth.js';
import { readLoadHistory } from '../lib/load-history.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const access = await requireEntitledAccount(request, env);
    if (!access.ok) {
      return json({ ok: false, error: access.error }, access.status || 401);
    }

    const account = ensureAccountShape(access.account);

    const peers = await loadPublicProfiles(env);
    const profile = await profileRecord(env, account, { owner: true });
    const profiles = peers.filter((peer) => peer.userId !== profile.userId);

    return json({
      ok: true,
      profile,
      profiles,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return json({ ok: false, error: 'Leaderboard lookup failed.' }, 500);
  }
}

async function loadPublicProfiles(env) {
  return Promise.all(
    (await listLeaderboardAccounts(env)).map((account) =>
      profileRecord(env, ensureAccountShape(account), { owner: false }),
    ),
  );
}

async function profileRecord(env, account, { owner = false } = {}) {
  const profile = owner ? publicProfile(account) : peerIdentityProfile(account);
  // Every peer-facing derivation must use the same safe projection. Starting
  // with a whitelist and then consulting the original account for location,
  // equipment, or badges would let notes, trips, alerts, or tags leak back
  // into public fields indirectly.
  const rankingAccount = owner ? account : peerRankingAccount(profile, account);
  // Public performance is derived exclusively from server-recorded, verified load
  // history. Profile snapshots (recentLoads, trips, alerts, ratings, and custom
  // metrics) are member-editable and must never become public trust evidence.
  const history = await readLoadHistory(env, account.userId, 250);
  const completed = history.filter(
    (entry) => entry?.verified && String(entry.eventType).toLowerCase() === 'completed',
  );
  const verifiedLoads = completed.length;
  const verifiedMiles = 0;
  const reviewCount = 0;
  const reviewAverage = 0;
  const onTimePickupPct = 0;
  const onTimeDeliveryPct = 0;
  const cancellationPct = 0;
  const claimFreePct = 0;
  const repeatCustomerPct = 0;
  const currentSuccessfulLoadStreak = 0;
  const bestSuccessfulLoadStreak = 0;
  const recentVerifiedLoads = recentWindowCount(completed);
  const recentReviews = 0;
  const performance90Days = {
    verifiedLoads: recentVerifiedLoads,
    reviewCount: recentReviews,
    reviewAverage: reviewAverage,
    onTimePickupPct,
    onTimeDeliveryPct,
    claimFreePct,
    repeatCustomerPct,
  };
  const memberSince = cleanString(rankingAccount.createdAt || rankingAccount.emailVerifiedAt || new Date().toISOString(), 80);
  const location = deriveLocation(rankingAccount);
  const equipmentTypes = deriveEquipmentTypes(rankingAccount);
  const roleLabel = rankingRoleLabel(rankingAccount);
  const score = verifiedLoads ? leaderboardScore({
    verifiedLoads,
    verifiedMiles,
    onTimePickupPct,
    onTimeDeliveryPct,
    claimFreePct,
    cancellationPct,
    repeatCustomerPct,
    currentSuccessfulLoadStreak,
    reviewAverage,
    reviewCount,
    activeDays: activeDaysSince(memberSince),
  }) : 0;
  const insuranceVerification = serverVerificationLabel(rankingAccount);
  const authorityVerification = serverVerificationLabel(rankingAccount);
  const badgesEarned = deriveBadges(rankingAccount, { verifiedLoads, score, insuranceVerification, authorityVerification });

  return {
    ...profile,
    roleLabel,
    score,
    city: location.city,
    metroArea: location.metroArea,
    state: location.state,
    region: location.region,
    operatingRadiusMiles: location.operatingRadiusMiles,
    serviceArea: location.serviceArea,
    equipmentTypes,
    primaryEquipment: equipmentTypes[0] || 'Carrier',
    verifiedLoads,
    verifiedMiles,
    onTimePickupPct,
    onTimeDeliveryPct,
    claimFreePct,
    cancellationPct,
    repeatCustomerPct,
    currentSuccessfulLoadStreak,
    bestSuccessfulLoadStreak,
    performance90Days,
    memberSince,
    insuranceVerification,
    authorityVerification,
    badgesEarned,
    reviewCount,
    reviewAverage,
  };
}

function peerIdentityProfile(account) {
  const publicOwnerProfile = publicProfile(account);
  return {
    userId: cleanString(publicOwnerProfile.userId || "", 80),
    name: cleanString(publicOwnerProfile.name || "Member", 120),
    company: cleanString(publicOwnerProfile.company || "", 120),
    username: cleanString(publicOwnerProfile.username || "", 80),
    role: cleanString(publicOwnerProfile.role || "", 80),
    mc_dot: cleanString(publicOwnerProfile.mc_dot || "", 80),
    city: cleanString(publicOwnerProfile.city || "", 80),
    state: cleanString(publicOwnerProfile.state || "", 40),
    equipmentType: cleanString(publicOwnerProfile.equipmentType || "", 120),
    equipmentTypes: Array.isArray(publicOwnerProfile.equipmentTypes)
      ? publicOwnerProfile.equipmentTypes.slice(0, 12).map((item) => cleanString(item, 120))
      : [],
    avatarUrl: cleanString(publicOwnerProfile.avatarUrl || "", 280),
    logoUrl: cleanString(publicOwnerProfile.logoUrl || "", 280),
    bulletinColor: cleanString(publicOwnerProfile.bulletinColor || "", 40),
    showLanguagesSpoken: Boolean(publicOwnerProfile.showLanguagesSpoken),
    languagesSpoken: publicOwnerProfile.showLanguagesSpoken
      ? (publicOwnerProfile.languagesSpoken || []).slice(0, 12).map((item) => cleanString(item, 40))
      : [],
    languagesSpokenLabel: publicOwnerProfile.showLanguagesSpoken
      ? cleanString(publicOwnerProfile.languagesSpokenLabel || "", 160)
      : "",
  };
}

function peerRankingAccount(profile, account) {
  return {
    ...profile,
    createdAt: cleanString(account?.createdAt || "", 80),
    emailVerifiedAt: cleanString(account?.emailVerifiedAt || "", 80),
    carrierVerifiedAt: cleanString(account?.carrierVerifiedAt || "", 80),
  };
}

function recentWindowCount(items) {
  if (!Array.isArray(items)) return 0;
  const cutoff = Date.now() - 90 * 86400000;
  let count = 0;
  for (const item of items) {
    const text = String(item && typeof item === 'object' ? item.completedAt || item.createdAt || item.updatedAt || item.date || item.when || '' : item || '').trim();
    const ms = Date.parse(text);
    if (Number.isFinite(ms) && ms >= cutoff) count += 1;
  }
  return count;
}

function deriveLocation(account) {
  const originCandidates = [
    account.city,
    account.homeCity,
    account.baseCity,
    account.metroArea,
    account.serviceArea,
    account.location,
    account.note,
    firstText(account.laneAlerts, 'origin'),
    firstText(account.recentLoads, 'origin'),
    firstText(account.plannedTrips, 'origin'),
    firstText(account.recentRequests, 'from'),
  ].filter(Boolean);
  const parsed = parsePlace(originCandidates[0] || '');
  const city = cleanString(account.city || parsed.city || '', 80);
  const state = cleanString(account.state || parsed.state || parseStateFromText(account.serviceArea || '') || '', 40);
  const metroArea = cleanString(account.metroArea || account.serviceArea || (city ? `${city} Area` : '') || '', 120);
  const region = cleanString(account.region || regionFromState(state) || regionFromText(account.serviceArea || metroArea || city), 80);
  const operatingRadiusMiles = cleanNumber(account.operatingRadiusMiles || account.radiusMiles || account.serviceRadiusMiles || extractRadius(account.serviceArea || account.note || '') || firstNumber(account.laneAlerts, 'radius') || 100) || 100;
  const serviceArea = cleanString(account.serviceArea || [city && state ? `${city}, ${state}` : city || state || '', metroArea && metroArea !== city ? metroArea : '', `${operatingRadiusMiles} mile radius`].filter(Boolean).join(' · '), 180);
  return { city, metroArea, state, region, operatingRadiusMiles, serviceArea };
}

function deriveEquipmentTypes(account) {
  const raw = [
    account.equipmentTypes,
    account.primaryEquipment,
    account.equipmentType,
    account.type,
    account.role,
    firstText(account.laneAlerts, 'equipment'),
    firstText(account.recentLoads, 'equipment'),
    firstText(account.plannedTrips, 'equipment'),
    firstText(account.recentRequests, 'equipment'),
  ];
  const out = [];
  for (const value of raw.flatMap((item) => Array.isArray(item) ? item : [item])) {
    for (const label of normalizeEquipmentLabels(value)) {
      if (!out.includes(label)) out.push(label);
    }
  }
  return out.length ? out : [rankingRoleLabel(account)];
}

function normalizeEquipmentLabels(value) {
  const text = String(value || '').toLowerCase();
  const labels = [];
  const add = (label) => { if (!labels.includes(label)) labels.push(label); };
  if (/dry van|van\b/.test(text)) add('Dry van');
  if (/reefer|reefer trailer|cold/.test(text)) add('Reefer');
  if (/flatbed/.test(text)) add('Flatbed');
  if (/step deck/.test(text)) add('Step deck');
  if (/lowboy/.test(text)) add('Lowboy');
  if (/rgn/.test(text)) add('RGN');
  if (/conestoga/.test(text)) add('Conestoga');
  if (/power[- ]?only/.test(text)) add('Power only');
  if (/hotshot|hot shot/.test(text)) add('Hot shot');
  if (/box truck|liftgate|ramp/.test(text)) add('Box truck');
  if (/cargo van/.test(text)) add('Cargo van');
  if (/bobtail/.test(text)) add('Bobtail');
  if (/car carrier|auto transport/.test(text)) add('Car hauler');
  if (/tanker/.test(text)) add('Tanker');
  if (/dump truck/.test(text)) add('Dump truck');
  if (/oversize|oversized|specialized|heavy haul/.test(text)) add('Specialized and oversized freight');
  return labels;
}

function rankingRoleLabel(account) {
  const type = String(account.role || account.type || '').toLowerCase();
  if (/customer|shipper|pickup/.test(type)) return 'Loader';
  if (/broker|fleet/.test(type)) return 'Broker';
  if (/hotshot|hot shot/.test(type)) return 'Hot Shot Operator';
  if (/reefer/.test(type)) return 'Reefer Driver';
  if (/flatbed/.test(type)) return 'Flatbed Carrier';
  if (/step deck/.test(type)) return 'Step Deck Carrier';
  if (/lowboy|rgn/.test(type)) return 'Lowboy Operator';
  if (/conestoga/.test(type)) return 'Conestoga Carrier';
  if (/cargo van/.test(type)) return 'Cargo Van Carrier';
  if (/box truck/.test(type)) return 'Box Truck Carrier';
  if (/power[- ]?only/.test(type)) return 'Power Only Operator';
  if (/car carrier|auto transport/.test(type)) return 'Car Hauler';
  if (/tanker/.test(type)) return 'Tanker Operator';
  if (/dump truck/.test(type)) return 'Dump Truck Operator';
  return 'Carrier';
}

function leaderboardScore(stats) {
  const loadsScore = Math.min(360, stats.verifiedLoads * 7);
  const milesScore = Math.min(130, stats.verifiedMiles / 1000);
  const punctualityScore = (stats.onTimePickupPct * 1.1) + (stats.onTimeDeliveryPct * 1.1);
  const qualityScore = (stats.claimFreePct * 0.9) + ((100 - stats.cancellationPct) * 0.8) + (stats.repeatCustomerPct * 0.6);
  const streakScore = Math.min(120, stats.currentSuccessfulLoadStreak * 1.5 + stats.bestSuccessfulLoadStreak * 0.35);
  const reputationScore = (stats.reviewAverage * 4) + Math.min(80, stats.reviewCount * 3);
  const tenureScore = Math.min(80, stats.activeDays * 0.7);
  return Math.max(0, Math.min(1000, Math.round(loadsScore + milesScore + punctualityScore + qualityScore + streakScore + reputationScore + tenureScore)));
}

function deriveBadges(account, stats) {
  const badges = [];
  if (emailVerified(account)) badges.push('Email verified');
  if (stats.insuranceVerification === 'Verified') badges.push('Insurance verified');
  if (stats.authorityVerification === 'Verified') badges.push('Authority verified');
  if (stats.verifiedLoads >= 10) badges.push('Public score unlocked');
  if (stats.verifiedLoads >= 25) badges.push('Local rank eligible');
  if (stats.verifiedLoads >= 100) badges.push('Veteran operator');
  if (stats.score >= 800) badges.push('Elite trust');
  return [...new Set([...badges, ...(Array.isArray(account.tags) ? account.tags : [])])].slice(0, 8);
}

function verificationLabel(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (/verify|verified|approved|complete|done/i.test(text)) return 'Verified';
  return cleanString(text, 40);
}

function serverVerificationLabel(account) {
  // carrierVerifiedAt is assigned by the verification workflow, not profile
  // editing. Do not treat self-entered DOT/insurance text as verification.
  return Number.isFinite(Date.parse(String(account?.carrierVerifiedAt || '')))
    ? 'Verified'
    : 'Not verified';
}

function metric(value, fallback) {
  const n = Number(value);
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  return Math.max(0, Math.min(100, fallback));
}

function avg(values) {
  const nums = values.map((value) => Number(value)).filter((n) => Number.isFinite(n));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function activeDaysSince(dateText) {
  const ms = Date.parse(dateText);
  if (!Number.isFinite(ms)) return 1;
  return Math.max(1, Math.floor((Date.now() - ms) / 86400000));
}

function firstText(items, key) {
  if (!Array.isArray(items)) return '';
  for (const item of items) {
    const value = cleanString(item && typeof item === 'object' ? item[key] : item, 120);
    if (value) return value;
  }
  return '';
}

function firstNumber(items, key) {
  if (!Array.isArray(items)) return 0;
  for (const item of items) {
    const n = Number(item && typeof item === 'object' ? item[key] : item);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function parsePlace(value) {
  const text = String(value || '').trim();
  const match = text.match(/^([^,]+),\s*([A-Z]{2})$/i);
  if (match) return { city: cleanString(match[1], 80), state: cleanString(match[2].toUpperCase(), 20) };
  return { city: '', state: '' };
}

function parseStateFromText(text) {
  const match = String(text || '').match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY|DC)\b/i);
  return match ? match[1].toUpperCase() : '';
}

function extractRadius(text) {
  const match = String(text || '').match(/(\d{2,4})\s*mile/i);
  return match ? Number(match[1]) : 0;
}

function regionFromText(text) {
  const lower = String(text || '').toLowerCase();
  if (/southern california/.test(lower)) return 'Southern California';
  if (/northern california/.test(lower)) return 'Northern California';
  if (/texas/.test(lower)) return 'Texas';
  if (/florida/.test(lower)) return 'Florida';
  if (/georgia/.test(lower)) return 'Georgia';
  if (/midwest/.test(lower)) return 'Midwest';
  if (/southwest/.test(lower)) return 'Southwest';
  if (/southeast/.test(lower)) return 'Southeast';
  if (/northwest/.test(lower)) return 'Northwest';
  if (/northeast/.test(lower)) return 'Northeast';
  return '';
}

function regionFromState(state) {
  const map = {
    AL: 'South', AK: 'West', AZ: 'West', AR: 'South', CA: 'West', CO: 'West', CT: 'Northeast', DE: 'Northeast', FL: 'South', GA: 'South', HI: 'West', IA: 'Midwest', ID: 'West', IL: 'Midwest', IN: 'Midwest', KS: 'Midwest', KY: 'South', LA: 'South', MA: 'Northeast', MD: 'Northeast', ME: 'Northeast', MI: 'Midwest', MN: 'Midwest', MO: 'Midwest', MS: 'South', MT: 'West', NC: 'South', ND: 'Midwest', NE: 'Midwest', NH: 'Northeast', NJ: 'Northeast', NM: 'West', NV: 'West', NY: 'Northeast', OH: 'Midwest', OK: 'South', OR: 'West', PA: 'Northeast', RI: 'Northeast', SC: 'South', SD: 'Midwest', TN: 'South', TX: 'South', UT: 'West', VA: 'South', VT: 'Northeast', WA: 'West', WI: 'Midwest', WV: 'South', WY: 'West', DC: 'Northeast',
  };
  return map[String(state || '').toUpperCase()] || '';
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
