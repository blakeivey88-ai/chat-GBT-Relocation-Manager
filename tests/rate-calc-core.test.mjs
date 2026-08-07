import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUIPMENT_PRESETS,
  DEFAULT_REEFER_GAL_PER_HR,
  DEFAULT_IDLE_GAL_PER_HR,
  FUEL_CARD_ADVERTISED_RANGE,
  calcTrip,
} from "../dist/rate-calc-core.js";

test("baseline trip math matches the long-standing calculator behavior", () => {
  // 420 loaded + 60 deadhead at 8.5 MPG and $4.00/gal, $35 tolls, $50 extras,
  // $0.75/mi fixed, 20% margin — the classic example from the live page.
  const r = calcTrip({ loadedMiles: 420, deadheadMiles: 60, mpg: 8.5, fuelPrice: 4, tolls: 35, extras: 50, fixedPerMile: 0.75, marginPct: 20 });
  assert.ok(r);
  assert.equal(r.totalMiles, 480);
  assert.ok(Math.abs(r.fuelCost - (480 / 8.5) * 4) < 1e-9);
  assert.equal(r.extras, 85);
  assert.equal(r.fixed, 360);
  assert.ok(Math.abs(r.breakEven - (r.fuelCost + 85 + 360)) < 1e-9);
  assert.ok(Math.abs(r.target - r.breakEven * 1.2) < 1e-9);
  assert.ok(Math.abs(r.cpmLoaded - r.breakEven / 420) < 1e-9);
});

test("reefer and idle fuel are added as their own gallons, not per-mile guesses", () => {
  const base = calcTrip({ loadedMiles: 100, mpg: 5, fuelPrice: 4 });
  const withUnits = calcTrip({ loadedMiles: 100, mpg: 5, fuelPrice: 4, reeferHours: 10, idleHours: 5 });
  assert.equal(base.reeferCost, 0);
  assert.equal(base.idleCost, 0);
  assert.ok(Math.abs(withUnits.reeferGal - 10 * DEFAULT_REEFER_GAL_PER_HR) < 1e-9);
  assert.ok(Math.abs(withUnits.idleGal - 5 * DEFAULT_IDLE_GAL_PER_HR) < 1e-9);
  assert.ok(Math.abs(withUnits.breakEven - (base.breakEven + withUnits.reeferCost + withUnits.idleCost)) < 1e-9);
  // Custom burn rates override the defaults.
  const custom = calcTrip({ loadedMiles: 100, mpg: 5, fuelPrice: 4, reeferHours: 10, reeferGalPerHr: 1.1 });
  assert.ok(Math.abs(custom.reeferGal - 11) < 1e-9);
});

test("offered-rate result and margin clamp behave like the live page", () => {
  const r = calcTrip({ loadedMiles: 100, mpg: 10, fuelPrice: 4, offered: 30, marginPct: 500 });
  assert.equal(r.offered, 30);
  assert.ok(Math.abs(r.offeredDiff - (30 - r.breakEven)) < 1e-9);
  assert.ok(Math.abs(r.target - r.breakEven * 1.95) < 1e-9); // clamped at 95%
});

test("invalid or zero core inputs return null instead of fake numbers", () => {
  assert.equal(calcTrip({ loadedMiles: 0, mpg: 8, fuelPrice: 4 }), null);
  assert.equal(calcTrip({ loadedMiles: 100, mpg: 0, fuelPrice: 4 }), null);
  assert.equal(calcTrip({ loadedMiles: -5, mpg: 8, fuelPrice: 4 }), null);
  assert.equal(calcTrip({}), null);
});

test("fuel-card savings line uses the advertised range on total gallons", () => {
  const r = calcTrip({ loadedMiles: 100, mpg: 10, fuelPrice: 4, idleHours: 0 });
  assert.ok(Math.abs(r.cardSavingsLow - r.totalGal * FUEL_CARD_ADVERTISED_RANGE.low) < 1e-9);
  assert.ok(Math.abs(r.cardSavingsHigh - r.totalGal * FUEL_CARD_ADVERTISED_RANGE.high) < 1e-9);
  assert.ok(FUEL_CARD_ADVERTISED_RANGE.low < FUEL_CARD_ADVERTISED_RANGE.high);
});

test("equipment presets are well-formed, cover the small-equipment niche, and stay editable defaults", () => {
  assert.ok(EQUIPMENT_PRESETS.length >= 10);
  const ids = new Set();
  for (const p of EQUIPMENT_PRESETS) {
    assert.ok(p.id && !ids.has(p.id), `duplicate or missing id: ${p.id}`);
    ids.add(p.id);
    assert.ok(p.label);
    assert.ok(Number.isFinite(p.mpg) && p.mpg > 1 && p.mpg < 30, `implausible preset mpg for ${p.id}`);
    assert.ok(["diesel", "gas"].includes(p.fuel));
    assert.equal(typeof p.reefer, "boolean");
  }
  // The uncontested-niche equipment must be present.
  for (const required of ["hot-shot", "box-truck", "cargo-van", "reefer"]) {
    assert.ok(ids.has(required), `missing niche preset: ${required}`);
  }
  // Only the reefer preset models a reefer unit.
  assert.equal(EQUIPMENT_PRESETS.filter((p) => p.reefer).length, 1);
});
