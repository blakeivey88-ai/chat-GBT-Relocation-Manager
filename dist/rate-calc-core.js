// Rate calculator core math — pure, dependency-free, unit-tested.
//
// Every preset value here is an EDITABLE STARTING POINT shown to the user,
// never a claim about their truck. The driver's own numbers always win.
// Reefer and idle fuel are modeled separately because the reefer unit and an
// idling engine burn fuel that per-mile MPG math silently ignores.

export const EQUIPMENT_PRESETS = [
  { id: "cargo-van", label: "Cargo van / Sprinter", mpg: 16, fuel: "gas", reefer: false },
  { id: "hot-shot", label: "Hot shot (1-ton + gooseneck)", mpg: 10, fuel: "diesel", reefer: false },
  { id: "box-truck", label: "Box truck / straight (16–26 ft)", mpg: 9, fuel: "diesel", reefer: false },
  { id: "reefer", label: "Reefer (semi + refrigeration unit)", mpg: 6.2, fuel: "diesel", reefer: true },
  { id: "dry-van", label: "Dry van (semi)", mpg: 6.5, fuel: "diesel", reefer: false },
  { id: "flatbed", label: "Flatbed", mpg: 6.3, fuel: "diesel", reefer: false },
  { id: "step-deck", label: "Step deck", mpg: 6.3, fuel: "diesel", reefer: false },
  { id: "lowboy-rgn", label: "Lowboy / RGN", mpg: 5.5, fuel: "diesel", reefer: false },
  { id: "conestoga", label: "Conestoga", mpg: 6.3, fuel: "diesel", reefer: false },
  { id: "power-only", label: "Power only", mpg: 7, fuel: "diesel", reefer: false },
  { id: "car-hauler", label: "Car hauler", mpg: 6.5, fuel: "diesel", reefer: false },
  { id: "tanker", label: "Tanker", mpg: 6, fuel: "diesel", reefer: false },
  { id: "dump", label: "Dump truck", mpg: 6, fuel: "diesel", reefer: false },
];

export const DEFAULT_REEFER_GAL_PER_HR = 0.85;
export const DEFAULT_IDLE_GAL_PER_HR = 0.8;

// Advertised fuel-card discount range used ONLY for an illustrative savings
// line, always labeled as advertised-and-varies, never a promise.
export const FUEL_CARD_ADVERTISED_RANGE = { low: 0.1, high: 0.25 };

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function calcTrip(input = {}) {
  const loaded = positive(input.loadedMiles);
  const deadhead = positive(input.deadheadMiles);
  const totalMiles = loaded + deadhead;
  const mpg = positive(input.mpg);
  const fuelPrice = positive(input.fuelPrice);
  if (!loaded || !mpg) return null;

  const tractorGal = totalMiles / mpg;
  const reeferGal = positive(input.reeferHours) * (positive(input.reeferGalPerHr) || DEFAULT_REEFER_GAL_PER_HR);
  const idleGal = positive(input.idleHours) * (positive(input.idleGalPerHr) || DEFAULT_IDLE_GAL_PER_HR);
  const totalGal = tractorGal + reeferGal + idleGal;

  const fuelCost = tractorGal * fuelPrice;
  const reeferCost = reeferGal * fuelPrice;
  const idleCost = idleGal * fuelPrice;
  const extras = positive(input.tolls) + positive(input.extras);
  const fixed = positive(input.fixedPerMile) * totalMiles;
  const breakEven = fuelCost + reeferCost + idleCost + extras + fixed;

  const margin = Math.min(positive(input.marginPct), 95) / 100;
  const target = breakEven * (1 + margin);

  const offered = positive(input.offered);
  const offeredDiff = offered > 0 ? offered - breakEven : null;

  const cardLow = totalGal * FUEL_CARD_ADVERTISED_RANGE.low;
  const cardHigh = totalGal * FUEL_CARD_ADVERTISED_RANGE.high;

  return {
    totalMiles,
    tractorGal,
    reeferGal,
    idleGal,
    totalGal,
    fuelCost,
    reeferCost,
    idleCost,
    extras,
    fixed,
    breakEven,
    cpmLoaded: breakEven / loaded,
    target,
    targetProfit: target - breakEven,
    offered,
    offeredDiff,
    cardSavingsLow: cardLow,
    cardSavingsHigh: cardHigh,
  };
}

if (typeof window !== "undefined") {
  window.RMRateCalcCore = { EQUIPMENT_PRESETS, DEFAULT_REEFER_GAL_PER_HR, DEFAULT_IDLE_GAL_PER_HR, FUEL_CARD_ADVERTISED_RANGE, calcTrip };
}
