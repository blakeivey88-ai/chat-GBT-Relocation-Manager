import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, member, styles] = await Promise.all([
  readFile(new URL("../dist/app.js", import.meta.url), "utf8"),
  readFile(new URL("../dist/member.html", import.meta.url), "utf8"),
  readFile(new URL("../dist/styles.css", import.meta.url), "utf8"),
]);

test("truck-equipment sprite uses the 3-column by 5-row grid without offset nudges", () => {
  assert.match(app, /"15 ft box truck":\s*\{ x: "0%", y: "0%" \}/);
  assert.match(app, /"Box truck with liftgate":\s*\{ x: "50%", y: "0%" \}/);
  assert.match(app, /"Box truck with ramp":\s*\{ x: "100%", y: "0%" \}/);
  assert.match(app, /"Power only":\s*\{ x: "0%", y: "100%" \}/);

  assert.equal((styles.match(/background-size:\s*300% 500%/g) || []).length, 3);
  assert.equal(
    (styles.match(/background-position:\s*var\(--thumb-x\) var\(--thumb-y\)/g) || [])
      .length,
    3,
  );
  assert.doesNotMatch(styles, /background-size:\s*340% 560%/);
  assert.doesNotMatch(styles, /var\(--thumb-x\)\s*\+\s*10%/);
  assert.doesNotMatch(styles, /var\(--thumb-y\)\s*-\s*40%/);
  assert.match(member, /href="styles\.css\?v=2026081[0-9]-[a-z0-9-]+"/);
});
