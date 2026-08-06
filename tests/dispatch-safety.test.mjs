import test from "node:test";
import assert from "node:assert/strict";

import { buildDeterministicSummary } from "../functions/lib/dispatch.js";

test("deterministic summary reports an empty board honestly", () => {
  const input = { origin: "Boise, ID", destination: "Anywhere", equipment: "Any" };
  const summary = buildDeterministicSummary(input, [], null, true);
  assert.match(summary, /No open loads currently match/);
  assert.match(summary, /no invented matches/i);
});

test("deterministic summary is stable, bounded, and limited to five matches", () => {
  const input = { origin: "Atlanta, GA", destination: "Anywhere", equipment: "Box truck" };
  const matches = Array.from({ length: 8 }, (_, index) => ({
    from: `Atlanta ${index}`,
    to: `Nashville ${index}`,
    rate: 700 + index,
    ratePerMile: 2.5,
    eq: "26 ft Box",
  }));
  const first = buildDeterministicSummary(input, matches, null, true);
  const second = buildDeterministicSummary(input, matches, null, true);
  assert.equal(first, second);
  assert.ok(first.length <= 4000);
  assert.match(first, /5 real open loads/);
  assert.doesNotMatch(first, /Nashville 5/);
});

test("deterministic summary ignores contact details and secrets", () => {
  const sensitive = "do-not-expose@example.invalid";
  const summary = buildDeterministicSummary(
    { origin: "Atlanta, GA", destination: "Nashville, TN", equipment: "Box truck" },
    [{
      from: "Atlanta, GA",
      to: "Nashville, TN",
      rate: 750,
      ratePerMile: 3,
      eq: "26 ft Box",
      contactEmail: sensitive,
      contactPhone: "555-555-0100",
      apiKey: "secret-value",
      reasons: [sensitive],
    }],
    null,
    true,
  );
  assert.doesNotMatch(summary, /do-not-expose|555-555-0100|secret-value/);
});

test("deterministic summary handles malformed optional values without side effects", () => {
  const input = Object.freeze({ origin: "", destination: null, equipment: null });
  const match = Object.freeze({ from: null, to: null, rate: "not-a-number", eq: null });
  const summary = buildDeterministicSummary(input, [match], "not-an-object", true);
  assert.match(summary, /Origin not listed/);
  assert.match(summary, /\$0/);
  assert.deepEqual(input, { origin: "", destination: null, equipment: null });
});

test("shipper summary remains a draft checklist", () => {
  const summary = buildDeterministicSummary({}, [], null, false);
  assert.match(summary, /pickup planning checklist/i);
  assert.match(summary, /Nothing is posted without your approval/);
});
