import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public navigation changes sign in to sign out for an authenticated session", async () => {
  const source = await readFile(
    new URL("../dist/public-site.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /account\?\.session\?\.authenticated/);
  assert.match(source, /link\.textContent = "Sign out"/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /credentials: "include"/);
});

test("member navigation changes sign in to sign out after account hydration", async () => {
  const [source, member] = await Promise.all([
    readFile(new URL("../dist/app.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/member.html", import.meta.url), "utf8"),
  ]);
  assert.match(member, /<nav class="nav" id="mainNav"/);
  assert.match(source, /#mainNav a\[href\^="\/signin"\]/);
  assert.match(source, /headerAuth\.textContent = "Sign out"/);
  assert.match(source, /headerAuth\.removeAttribute\("data-route"\)/);
  assert.match(source, /logoutAccount\(\)/);
  assert.match(source, /headerCta\.textContent = "Workbench"/);
  assert.match(source, /route\("workbench"\)/);
});

test("member workspace loads the consolidated dark foundation", async () => {
  const member = await readFile(
    new URL("../dist/member.html", import.meta.url),
    "utf8",
  );
  const foundation = await readFile(
    new URL("../dist/member-dark-foundation-20260810.css", import.meta.url),
    "utf8",
  );
  assert.match(member, /member-dark-foundation-20260810\.css\?v=6/);
  assert.match(foundation, /--surface-page: #05070d/);
  assert.match(foundation, /--surface-raised: #0d1526/);
  assert.match(foundation, /--ink-muted: #b8c7df/);
  assert.match(
    foundation,
    /--member-surface-raised: var\(--surface-raised\)/,
  );
  assert.match(foundation, /body \.load-card/);
  assert.doesNotMatch(foundation, /!important/);
  const declarations = [...foundation.matchAll(/(?:color|background):\s*(#[0-9a-f]{3,8})/gi)];
  assert.deepEqual(
    declarations,
    [],
    "member component rules should consume semantic tokens, not raw colors",
  );
});
