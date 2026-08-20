import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const skip = new Set([
  "login.html",
  "billing.html",
  "success.html",
  "thank-you.html",
]);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

test("public pages share the approved homepage/profile vibe stylesheet", async () => {
  const files = await htmlFiles(new URL("../dist", import.meta.url).pathname);
  const missing = [];
  const stale = [];
  for (const file of files) {
    if (skip.has(file.split("/").pop())) continue;
    const html = await readFile(file, "utf8");
    if (!html.includes("site-vibe.css")) missing.push(relative(new URL("../dist", import.meta.url).pathname, file));
    if (html.includes("20260811-vibe-1")) stale.push(relative(new URL("../dist", import.meta.url).pathname, file));
  }
  assert.deepEqual(missing, [], `missing site-vibe.css on ${missing.join(", ")}`);
  assert.deepEqual(stale, [], `stale vibe version on ${stale.join(", ")}`);
});

test("site-vibe locks Archivo, dark navy, and resource-page topbar", async () => {
  const css = await readFile(new URL("../dist/site-vibe.css", import.meta.url), "utf8");
  assert.match(css, /--vibe-navy-0:\s*#050b18/);
  assert.match(css, /--vibe-blue:\s*#3b82f6/);
  assert.match(css, /--vibe-gold:\s*#fbbf24/);
  assert.match(css, /Archivo/);
  assert.match(css, /html body \.topbar/);
  assert.match(css, /html body \.eyebrow\.dark/);
  assert.match(css, /html body \.crumbs a/);
});
