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

if (typeof window !== "undefined") {
  window.RMPartnerSelect = { eligiblePartners, selectPartner };
}
