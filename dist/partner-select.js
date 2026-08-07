// Partner offer selection — pure, dependency-free, unit-tested.
//
// The registry (partners.json) is DATA: Blake can add any number of partners
// without a code change. The page shows at most ONE primary offer (best match
// for the visitor's equipment + fuel type) plus an optional compare list.
// If nothing matches — or nothing is active yet — the slot renders NOTHING.
// A mismatched or placeholder ad is worse than no ad.

function asList(value) {
  return Array.isArray(value) ? value : [];
}

export function eligiblePartners(partners, ctx = {}) {
  const equipment = String(ctx.equipment || "");
  const fuelType = String(ctx.fuelType || "");
  return asList(partners).filter((p) => {
    if (!p || p.active !== true) return false;
    if (typeof p.url !== "string" || !/^https:\/\//.test(p.url)) return false;
    if (!p.name || !p.category) return false;
    const eq = asList(p.equipment);
    if (!eq.includes("all") && equipment && !eq.includes(equipment)) return false;
    const fuel = asList(p.fuel_type);
    if (!fuel.includes("all") && fuelType && !fuel.includes(fuelType)) return false;
    return true;
  });
}

export function selectPartner(partners, ctx = {}) {
  const matches = eligiblePartners(partners, ctx)
    .slice()
    .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0) || String(a.id).localeCompare(String(b.id)));
  return { primary: matches[0] || null, matches };
}

// A savings estimate may be shown ONLY when an ACTIVE, eligible fuel-card
// partner supplies its own advertised discount range, backed by a direct
// https source URL and a verification date. No qualifying partner -> null,
// and the page shows no savings line at all. We never advertise a generic
// benefit that no live partner actually offers.
export function savingsRange(partners, ctx = {}) {
  const candidates = eligiblePartners(partners, ctx).filter((p) => p.category === "fuel-card");
  candidates.sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0) || String(a.id).localeCompare(String(b.id)));
  for (const p of candidates) {
    const r = p.discount_range;
    if (!r) continue;
    const low = Number(r.low);
    const high = Number(r.high);
    if (!(low > 0 && high > low)) continue;
    if (typeof r.source !== "string" || !/^https:\/\/\S+$/.test(r.source)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.verified_date || ""))) continue;
    return { low, high, source: r.source, verified_date: r.verified_date, partner: p };
  }
  return null;
}

if (typeof window !== "undefined") {
  window.RMPartnerSelect = { eligiblePartners, selectPartner, savingsRange };
}
