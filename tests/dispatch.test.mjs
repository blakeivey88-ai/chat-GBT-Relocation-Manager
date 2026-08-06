import test from "node:test";
import assert from "node:assert/strict";
import {
  makeLaneAlertDraft,
  normalizeDispatchInput,
  rankDispatchLoads,
} from "../functions/lib/dispatch.js";

const loads = [
  {
    id: "best",
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 750,
    mi: 250,
    eq: "26 ft Box Truck",
    trust: 94,
    insurance: "Verified",
    status: "open",
  },
  {
    id: "wrong-equipment",
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 1500,
    mi: 250,
    eq: "53 ft Dry Van",
    trust: 96,
    insurance: "Verified",
    status: "open",
  },
  {
    id: "untrusted",
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 900,
    mi: 250,
    eq: "26 ft Box Truck",
    trust: 42,
    insurance: "Pending",
    status: "open",
  },
];

test("requires an origin", () => {
  assert.equal(normalizeDispatchInput({}).error, "Enter a current or pickup location.");
});

test("ranks trusted equipment and route matches first", () => {
  const { input } = normalizeDispatchInput({
    origin: "Atlanta, GA",
    destination: "Nashville, TN",
    equipment: "26 ft box truck",
    minimumRatePerMile: 2.5,
  });
  const matches = rankDispatchLoads(loads, input, 5);
  assert.equal(matches[0].id, "best");
  assert.equal(matches[0].ratePerMile, 3);
  assert.equal(matches.some((load) => load.id === "untrusted"), false);
});

test("drafts a Lane Alert without activating it", () => {
  const draft = makeLaneAlertDraft({
    origin: "Atlanta, GA",
    destination: "Anywhere",
    equipment: "Cargo van",
    minimumRatePerMile: 2,
  });
  assert.equal(draft.source, "ai_dispatch_assistant");
  assert.equal(draft.notificationPreferences.inApp, true);
  assert.equal("active" in draft, false);
});
