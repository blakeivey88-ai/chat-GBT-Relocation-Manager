import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { estimateCubeFit } from "../dist/tools/cube-fit-core.js";
import { estimateWaitCost } from "../dist/tools/wait-cost-core.js";

const middleware = await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8");
const toolsHub = await readFile(new URL("../dist/tools/index.html", import.meta.url), "utf8");
const cubePage = await readFile(new URL("../dist/tools/cube-fit.html", import.meta.url), "utf8");
const waitPage = await readFile(new URL("../dist/tools/wait-cost.html", import.meta.url), "utf8");
const callPage = await readFile(new URL("../dist/tools/before-you-call.html", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../dist/sitemap.xml", import.meta.url), "utf8");

test("cube fit: clear over-volume is no", () => {
  const result = estimateCubeFit(
    { lengthFt: 10, widthFt: 5, heightFt: 5, maxLb: 5000 },
    [{ lengthIn: 100, widthIn: 100, heightIn: 100, weightLb: 100, qty: 20, stackable: true }],
  );
  assert.equal(result.ok, true);
  assert.equal(result.verdict, "no");
});

test("cube fit: light pallet load fits", () => {
  const result = estimateCubeFit(
    { lengthFt: 26, widthFt: 8, heightFt: 8, maxLb: 10000 },
    [{ lengthIn: 48, widthIn: 40, heightIn: 48, weightLb: 400, qty: 2, stackable: true }],
  );
  assert.equal(result.ok, true);
  assert.equal(result.verdict, "fits");
  assert.ok(result.volumePct < 50);
});

test("cube fit: overweight fails even if volume ok", () => {
  const result = estimateCubeFit(
    { lengthFt: 26, widthFt: 8, heightFt: 8, maxLb: 1000 },
    [{ lengthIn: 20, widthIn: 20, heightIn: 20, weightLb: 800, qty: 2, stackable: true }],
  );
  assert.equal(result.ok, true);
  assert.equal(result.verdict, "no");
  assert.ok(result.weightPct > 100);
});

test("wait cost: hourly path", () => {
  const result = estimateWaitCost({ hourlyValue: 60, waitHours: 3, detentionPayPerHour: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.waitCost, 180);
  assert.equal(result.netCost, 180);
});

test("wait cost: daily fixed derives hourly", () => {
  const result = estimateWaitCost({
    dailyFixedCost: 500,
    hoursPerWorkDay: 10,
    waitHours: 2,
    detentionPayPerHour: 50,
  });
  assert.equal(result.ok, true);
  assert.equal(result.hourlyValue, 50);
  assert.equal(result.waitCost, 100);
  assert.equal(result.detentionIncome, 100);
  assert.equal(result.netCost, 0);
});

test("tool pages link ads config and reserve slots", () => {
  for (const page of [cubePage, waitPage, callPage, toolsHub]) {
    assert.match(page, /display-ads-config\.js/);
    assert.match(page, /data-rm-ad-slot=/);
    assert.match(page, /ca-pub-9768509838353886/);
  }
});

test("tools hub links all four live tools", () => {
  assert.match(toolsHub, /\/rate-calculator/);
  assert.match(toolsHub, /\/tools\/cube-fit/);
  assert.match(toolsHub, /\/tools\/wait-cost/);
  assert.match(toolsHub, /\/tools\/before-you-call/);
  assert.doesNotMatch(toolsHub, /Coming next/);
});

test("middleware and sitemap include new tools", () => {
  for (const path of [
    "'/tools/cube-fit'",
    "'/tools/wait-cost'",
    "'/tools/before-you-call'",
    "'/tools/cube-fit-core.js'",
    "'/tools/wait-cost-core.js'",
  ]) {
    assert.ok(middleware.includes(path), `middleware missing ${path}`);
  }
  assert.match(sitemap, /tools\/cube-fit/);
  assert.match(sitemap, /tools\/wait-cost/);
  assert.match(sitemap, /tools\/before-you-call/);
});

test("before-you-call has checklist and copyable script", () => {
  assert.match(callPage, /checklist/);
  assert.match(callPage, /rate confirmation in writing/i);
  assert.match(callPage, /copyScript|Copy script/);
});
