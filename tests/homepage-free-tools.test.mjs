import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const pub = await readFile(new URL("../dist/public-site.js", import.meta.url), "utf8");

test("homepage surfaces free tools in nav, hero, section, and footer", () => {
  assert.match(home, /href="\/tools\/"/);
  assert.match(home, /id="free-tools"/);
  assert.match(home, /tools\/cube-fit/);
  assert.match(home, /tools\/wait-cost/);
  assert.match(home, /tools\/before-you-call/);
  assert.match(home, /rate-calculator/);
  assert.match(home, /Free tools/);
  assert.match(home, /public-site\.js\?v=20260811-tools-nav-1/);
});

test("public-site injects free tools nav and footer when missing", () => {
  assert.match(pub, /data-free-tools-nav|Free tools/);
  assert.match(pub, /data-free-tools-footer/);
  assert.match(pub, /tools\/cube-fit/);
  assert.match(pub, /before-you-call/);
});
