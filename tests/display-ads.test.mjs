import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adsJs = await readFile(new URL("../dist/display-ads.js", import.meta.url), "utf8");
const adsCss = await readFile(new URL("../dist/display-ads.css", import.meta.url), "utf8");
const adsCfg = await readFile(new URL("../dist/display-ads-config.js", import.meta.url), "utf8");
const tools = await readFile(new URL("../dist/tools/index.html", import.meta.url), "utf8");
const rate = await readFile(new URL("../dist/rate-calculator.html", import.meta.url), "utf8");
const analytics = await readFile(new URL("../dist/analytics-loader.js", import.meta.url), "utf8");
const middleware = await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8");

test("display ads require consent and a ca-pub client id for live fills", () => {
  assert.match(adsJs, /rm-analytics-consent/);
  assert.match(adsJs, /ca-pub-/);
  assert.match(adsJs, /pagead2\.googlesyndication\.com/);
  assert.match(adsJs, /rm-consent-granted/);
  assert.match(adsJs, /data-rm-ad-slot/);
  assert.match(adsJs, /resolveSlotId|cfg\.slots/);
});

test("shared ads config is the single place for publisher and unit ids", () => {
  assert.match(adsCfg, /adsenseClientId/);
  assert.match(adsCfg, /rate_calc_top/);
  assert.match(adsCfg, /tools_hub_top/);
  assert.match(rate, /display-ads-config\.js/);
  assert.match(tools, /display-ads-config\.js/);
  assert.ok(middleware.includes("'/display-ads-config.js'"));
  assert.ok(middleware.includes("'/ads.txt'"));
});

test("ad CSS reserves space for leaderboard and rectangle units", () => {
  assert.match(adsCss, /\.rm-ad-slot--leaderboard/);
  assert.match(adsCss, /\.rm-ad-slot--rectangle/);
  assert.match(adsCss, /min-height:\s*90px/);
  assert.match(adsCss, /min-height:\s*250px/);
});

test("tools hub has ad slots and links the live calculator", () => {
  assert.match(tools, /data-rm-ad-slot="tools_hub_top"/);
  assert.match(tools, /data-rm-ad-slot="tools_hub_mid"/);
  assert.match(tools, /data-rm-ad-slot="tools_hub_footer"/);
  assert.match(tools, /href="\/rate-calculator"/);
  assert.match(tools, /display-ads\.js/);
});

test("consent banner covers analytics and ads and notifies ad loader", () => {
  assert.match(analytics, /Allow analytics &amp; ads|Allow analytics & ads/);
  assert.match(analytics, /rm-consent-granted/);
  assert.match(analytics, /rm-consent-denied/);
});
