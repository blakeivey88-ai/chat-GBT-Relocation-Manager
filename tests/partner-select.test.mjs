import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { eligiblePartners, selectPartner, savingsRange } from "../dist/partner-select.js";

const partner = (overrides = {}) => ({
  id: "p1",
  name: "Test Partner",
  category: "factoring",
  headline: "Get paid today.",
  equipment: ["all"],
  fuel_type: ["all"],
  disclosure_label: "Partner offer",
  url: "https://example.com/ref/rmusa",
  weight: 50,
  active: true,
  ...overrides,
});

test("inactive partners and partners without a real https url never render", () => {
  const partners = [
    partner({ id: "inactive", active: false }),
    partner({ id: "no-url", url: "" }),
    partner({ id: "http-url", url: "http://insecure.example.com" }),
    partner({ id: "js-url", url: "javascript:alert(1)" }),
  ];
  assert.equal(selectPartner(partners, { equipment: "hot-shot", fuelType: "diesel" }).primary, null);
  assert.equal(eligiblePartners(partners, {}).length, 0);
});

test("equipment and fuel-type matching: specific lists filter, 'all' matches everything", () => {
  const partners = [
    partner({ id: "diesel-only", fuel_type: ["diesel"], weight: 10 }),
    partner({ id: "hot-shot-only", equipment: ["hot-shot"], weight: 20 }),
    partner({ id: "everyone", weight: 5 }),
  ];
  // Gas cargo van: diesel-only and hot-shot-only are excluded.
  const gasVan = selectPartner(partners, { equipment: "cargo-van", fuelType: "gas" });
  assert.equal(gasVan.matches.length, 1);
  assert.equal(gasVan.primary.id, "everyone");
  // Diesel hot shot: all three match; highest weight wins.
  const hotShot = selectPartner(partners, { equipment: "hot-shot", fuelType: "diesel" });
  assert.equal(hotShot.matches.length, 3);
  assert.equal(hotShot.primary.id, "hot-shot-only");
});

test("empty context still works (no equipment chosen) and empty registry yields nothing", () => {
  assert.equal(selectPartner([], {}).primary, null);
  assert.equal(selectPartner(undefined, {}).primary, null);
  const anyMatch = selectPartner([partner()], {});
  assert.equal(anyMatch.primary.id, "p1");
});

test("savings range requires an ACTIVE eligible fuel-card partner with a verifiable range", () => {
  const validRange = { low: 0.15, high: 0.4, unit: "usd_per_gallon", source: "https://example.com/fuel-terms", verified_date: "2026-08-07" };
  // No partners / no fuel-card partner / inactive partner -> null.
  assert.equal(savingsRange([], {}), null);
  assert.equal(savingsRange([partner({ category: "factoring", discount_range: validRange })], {}), null);
  assert.equal(savingsRange([partner({ category: "fuel-card", active: false, discount_range: validRange })], {}), null);
  // Active fuel-card partner but WITHOUT its own range -> null (never a generic claim).
  assert.equal(savingsRange([partner({ category: "fuel-card" })], {}), null);
  // Invalid ranges are rejected: bad bounds, non-https source, missing date.
  assert.equal(savingsRange([partner({ category: "fuel-card", discount_range: { ...validRange, low: 0.5 } })], {}), null);
  assert.equal(savingsRange([partner({ category: "fuel-card", discount_range: { ...validRange, source: "industry marketing pages" } })], {}), null);
  assert.equal(savingsRange([partner({ category: "fuel-card", discount_range: { ...validRange, verified_date: "" } })], {}), null);
  // A fully valid one is returned, honoring eligibility (fuel type) and weight.
  const partners = [
    partner({ id: "gas-card", category: "fuel-card", fuel_type: ["gas"], weight: 99, discount_range: validRange }),
    partner({ id: "diesel-card", category: "fuel-card", fuel_type: ["diesel"], weight: 10, discount_range: { ...validRange, low: 0.2 } }),
  ];
  const forDiesel = savingsRange(partners, { equipment: "hot-shot", fuelType: "diesel" });
  assert.equal(forDiesel.partner.id, "diesel-card");
  assert.equal(forDiesel.low, 0.2);
  assert.equal(forDiesel.source, validRange.source);
});

test("shipped partners.json parses, matches the schema, and every entry starts INACTIVE with no url", async () => {
  const raw = await readFile(new URL("../dist/partners.json", import.meta.url), "utf8");
  const data = JSON.parse(raw);
  assert.ok(Array.isArray(data.partners) && data.partners.length >= 3);
  assert.equal("claims" in data, false, "generic claims block must not exist; ranges are per-partner");

  // Every partner's payout is metadata with a verification date, never a promise.
  for (const p of data.partners) {
    assert.ok(p.payout_advertised, `${p.id} missing payout_advertised`);
    assert.match(String(p.payout_verified_date), /^\d{4}-\d{2}-\d{2}$/, `${p.id} missing payout_verified_date`);
    // Until written partner terms exist, no shipped partner may carry a range.
    assert.equal("discount_range" in p, false, `${p.id} must not ship a discount_range without written terms`);
  }
  // Therefore no savings claim can render from the shipped registry.
  assert.equal(savingsRange(data.partners, { equipment: "hot-shot", fuelType: "diesel" }), null);
  const ids = new Set();
  for (const p of data.partners) {
    assert.ok(p.id && !ids.has(p.id));
    ids.add(p.id);
    assert.ok(p.name && p.category && p.disclosure_label);
    assert.ok(["factoring", "fuel-card", "insurance", "eld", "tax"].includes(p.category));
    assert.ok(Array.isArray(p.equipment) && p.equipment.length > 0);
    assert.ok(Array.isArray(p.fuel_type) && p.fuel_type.length > 0);
    // Until Blake signs programs and adds referral URLs, nothing may render.
    assert.equal(p.active, false, `${p.id} must ship inactive`);
    assert.equal(p.url, "", `${p.id} must ship without a url`);
  }
  // And therefore the live registry selects nothing today.
  assert.equal(selectPartner(data.partners, { equipment: "hot-shot", fuelType: "diesel" }).primary, null);
});
