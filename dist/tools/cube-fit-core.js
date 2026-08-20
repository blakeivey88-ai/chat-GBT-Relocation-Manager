/**
 * Cube & weight fit estimate for box trucks / small equipment.
 * Honest volume + weight math — not a full 3D packer.
 */

export const TRUCK_PRESETS = [
  {
    id: "cargo-van",
    label: "Cargo van (approx.)",
    lengthFt: 10,
    widthFt: 5.5,
    heightFt: 5.5,
    maxLb: 3000,
  },
  {
    id: "box-16",
    label: '16\' box truck (approx.)',
    lengthFt: 16,
    widthFt: 7.5,
    heightFt: 7,
    maxLb: 5000,
  },
  {
    id: "box-20",
    label: '20\' box truck (approx.)',
    lengthFt: 20,
    widthFt: 8,
    heightFt: 8,
    maxLb: 7000,
  },
  {
    id: "box-26",
    label: '26\' box truck (approx.)',
    lengthFt: 26,
    widthFt: 8,
    heightFt: 8.5,
    maxLb: 10000,
  },
  {
    id: "custom",
    label: "Custom dimensions",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    maxLb: 0,
  },
];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {object} truck
 * @param {number} truck.lengthFt
 * @param {number} truck.widthFt
 * @param {number} truck.heightFt
 * @param {number} truck.maxLb
 * @param {Array<{lengthIn:number,widthIn:number,heightIn:number,weightLb:number,stackable?:boolean,qty?:number}>} items
 */
export function estimateCubeFit(truck, items = []) {
  const lengthFt = num(truck.lengthFt);
  const widthFt = num(truck.widthFt);
  const heightFt = num(truck.heightFt);
  const maxLb = num(truck.maxLb);

  if (
    !(lengthFt > 0) ||
    !(widthFt > 0) ||
    !(heightFt > 0) ||
    !(maxLb > 0)
  ) {
    return {
      ok: false,
      error: "Enter truck length, width, height (feet), and max payload (lb).",
    };
  }

  const list = Array.isArray(items) ? items : [];
  const expanded = [];
  for (const raw of list) {
    const qty = Math.max(1, Math.min(50, Math.floor(num(raw.qty) || 1)));
    const lengthIn = num(raw.lengthIn);
    const widthIn = num(raw.widthIn);
    const heightIn = num(raw.heightIn);
    const weightLb = num(raw.weightLb);
    if (
      !(lengthIn > 0) ||
      !(widthIn > 0) ||
      !(heightIn > 0) ||
      !(weightLb >= 0)
    ) {
      continue;
    }
    for (let i = 0; i < qty; i += 1) {
      expanded.push({
        lengthIn,
        widthIn,
        heightIn,
        weightLb,
        stackable: raw.stackable !== false,
      });
    }
  }

  if (!expanded.length) {
    return {
      ok: false,
      error: "Add at least one item with length, width, height (inches), and weight.",
    };
  }

  const truckCuFt = lengthFt * widthFt * heightFt;
  const floorSqFt = lengthFt * widthFt;
  // Real packing wastes space (gaps, straps, irregular shapes).
  const usableVolumeFactor = 0.75;
  const usableFloorFactor = 0.8;
  const usableCuFt = truckCuFt * usableVolumeFactor;
  const usableFloorSqFt = floorSqFt * usableFloorFactor;

  let totalCuFt = 0;
  let totalLb = 0;
  let floorSqFtUsed = 0;
  let nonStackableCount = 0;

  for (const item of expanded) {
    const cuFt = (item.lengthIn * item.widthIn * item.heightIn) / 1728;
    totalCuFt += cuFt;
    totalLb += item.weightLb;
    const footprint = (item.lengthIn * item.widthIn) / 144;
    if (item.stackable) {
      // Stackable items still need some floor; count ~half footprint as a soft estimate.
      floorSqFtUsed += footprint * 0.5;
    } else {
      floorSqFtUsed += footprint;
      nonStackableCount += 1;
    }
  }

  const volumeRatio = totalCuFt / usableCuFt;
  const weightRatio = totalLb / maxLb;
  const floorRatio = floorSqFtUsed / usableFloorSqFt;

  const overVolume = volumeRatio > 1;
  const overWeight = weightRatio > 1;
  const overFloor = floorRatio > 1;

  let verdict = "fits";
  let label = "Likely fits (estimate)";
  if (overVolume || overWeight || overFloor) {
    verdict = "no";
    label = "Likely will not fit";
  } else if (volumeRatio > 0.85 || weightRatio > 0.9 || floorRatio > 0.85) {
    verdict = "tight";
    label = "Tight — measure carefully";
  }

  const reasons = [];
  if (overVolume) reasons.push("Item volume exceeds usable box volume (75% packing factor).");
  if (overWeight) reasons.push("Total weight exceeds max payload.");
  if (overFloor) reasons.push("Floor footprint looks too full (non-stackable items use full floor).");
  if (nonStackableCount > 0 && verdict !== "no") {
    reasons.push(
      `${nonStackableCount} non-stackable piece(s) counted at full floor footprint.`,
    );
  }

  return {
    ok: true,
    verdict,
    label,
    itemCount: expanded.length,
    truckCuFt: round1(truckCuFt),
    usableCuFt: round1(usableCuFt),
    totalCuFt: round1(totalCuFt),
    volumePct: round0(volumeRatio * 100),
    totalLb: round0(totalLb),
    maxLb: round0(maxLb),
    weightPct: round0(weightRatio * 100),
    floorPct: round0(floorRatio * 100),
    reasons,
    disclaimer:
      "Estimate only — real packing depends on door height, shape, straps, and how you load. Measure twice before you commit.",
  };
}

function round0(n) {
  return Math.round(n);
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
