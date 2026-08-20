import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../dist/rate-calculator.html", import.meta.url), "utf8");
const middleware = await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8");

test("the page wires the tested modules instead of duplicating math inline", () => {
  assert.match(page, /import \{[^}]*calcTrip[^}]*\} from "\/rate-calc-core\.js/);
  assert.match(page, /import \{[^}]*selectPartner[^}]*\} from "\/partner-select\.js/);
  assert.match(page, /fetch\("\/partners\.json"\)/);
});

test("new inputs exist: equipment, fuel type, reefer hours, idle hours", () => {
  for (const marker of ['id="equipmentSelect"', 'id="fuelTypeSelect"', 'name="reeferHours"', 'name="idleHours"']) {
    assert.ok(page.includes(marker), `missing ${marker}`);
  }
});

test("a driver's URL-provided MPG always beats the equipment preset (order of prefills)", () => {
  // The equipment prefill (which overwrites MPG with an average) must run
  // BEFORE the explicit numeric URL prefills, so ?equipment=...&mpg=REAL keeps
  // the driver's real number.
  const equipmentIdx = page.indexOf("prefillEquipment");
  const numericIdx = page.indexOf("Object.entries(prefillMap)");
  assert.ok(equipmentIdx > 0 && numericIdx > 0);
  assert.ok(equipmentIdx < numericIdx, "equipment prefill must run before numeric prefills");
});

test("margin is described and computed as TRUE margin, and savings come only from a qualifying partner", () => {
  assert.match(page, /True margin, not markup/i);
  assert.match(page, /savingsRange\(partnerData\?\.partners/); // range from an active eligible partner's own data
  assert.doesNotMatch(page, /FUEL_CARD_ADVERTISED_RANGE/); // no hardcoded claim constant
  assert.doesNotMatch(page, /fuel_card_advertised_discount/); // no generic claims block either
  assert.doesNotMatch(page, /\$0\.10|\$0\.25/); // no hardcoded discount figures anywhere in the page
});

test("honesty guardrails are present in the page copy", () => {
  // MPG prefill labeled as an average to replace with the real number.
  assert.match(page, /replace it with your truck's real number/i);
  // Savings line wording cites the partner's own dated range, never a promise.
  assert.match(page, /their advertised range as of .*actual discounts vary/i);
  // Plausibility nudge thresholds exist in the script.
  assert.match(page, /1\.15–\$1\.45/);
  // Partner slot ships hidden and discloses commission.
  assert.match(page, /id="partnerSlot" hidden/);
  assert.match(page, /We may earn a commission/i);
  assert.match(page, /noopener sponsored/); // set via JS: link.rel = "noopener sponsored"
  // Planning-tool disclaimer retained.
  assert.match(page, /not a rate guarantee or financial advice/i);
});

test("existing behavior is preserved: prefill params, EIA link, signup funnel, schema", () => {
  assert.match(page, /prefillMap = \{ loaded: "loadedMiles"/);
  assert.match(page, /eia\.gov\/petroleum\/gasdiesel/);
  assert.match(page, /signup\.html\?plan=driver/);
  assert.match(page, /"@type": "WebApplication"/);
  assert.match(page, /"@type": "FAQPage"/);
});

test("middleware allowlists the three new public assets", () => {
  for (const path of ["'/rate-calc-core.js'", "'/partner-select.js'", "'/partners.json'"]) {
    assert.ok(middleware.includes(path), `middleware missing ${path}`);
  }
});

test("display ad slots are reserved on the rate calculator", () => {
  assert.match(page, /display-ads\.css/);
  assert.match(page, /display-ads\.js/);
  assert.match(page, /display-ads-config\.js/);
  for (const slot of [
    'data-rm-ad-slot="rate_calc_top"',
    'data-rm-ad-slot="rate_calc_sidebar"',
    'data-rm-ad-slot="rate_calc_mid"',
    'data-rm-ad-slot="rate_calc_footer"',
  ]) {
    assert.ok(page.includes(slot), `missing ${slot}`);
  }
});

test("middleware allowlists display ads assets and tools hub", () => {
  for (const path of [
    "'/display-ads.js'",
    "'/display-ads.css'",
    "'/display-ads-config.js'",
    "'/ads.txt'",
    "'/tools'",
    "pagead2.googlesyndication.com",
  ]) {
    assert.ok(middleware.includes(path), `middleware missing ${path}`);
  }
});
