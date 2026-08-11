import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { authRedirectPath } from "../functions/api/_auth.js";

const memberAccount = {
  userId: "usr_signin_redirect",
  email: "signin-redirect@example.com",
  name: "Sign In Redirect",
  company: "Redirect Test LLC",
  type: "Truck driver / owner-operator - $14.99/mo",
  role: "Truck Driver",
  emailVerifiedAt: "2026-08-08T12:00:00.000Z",
  paymentStatus: "paid_driver",
  subscriptionStatus: "active",
  checkoutPlan: "driver",
  profileComplete: true,
};

test("member redirects discard admin preview state and default to profile", () => {
  assert.equal(
    authRedirectPath(memberAccount, {
      redirectTarget: "/member?preview=driver",
    }),
    "/member.html#profile",
  );
});

test("member redirects preserve a valid exact screen and remove preview only", () => {
  assert.equal(
    authRedirectPath(memberAccount, {
      redirectTarget: "/member.html?source=signin&PREVIEW=customer#loads",
    }),
    "/member.html?source=signin#loads",
  );
  assert.equal(
    authRedirectPath(memberAccount, {
      redirectTarget: "/member#dashboard",
    }),
    "/member.html#dashboard",
  );
});

test("member redirects replace unknown fragments with the profile screen", () => {
  assert.equal(
    authRedirectPath(memberAccount, {
      redirectTarget: "/member.html#not-a-real-screen",
    }),
    "/member.html#profile",
  );
  assert.equal(
    authRedirectPath(memberAccount, {
      redirectTarget: "/member.html#%E0%A4%A",
    }),
    "/member.html#profile",
  );
});

test("non-member safe redirects and external redirect rejection are unchanged", () => {
  assert.equal(
    authRedirectPath(memberAccount, { redirectTarget: "/support.html" }),
    "/support.html",
  );
  assert.equal(
    authRedirectPath(memberAccount, {
      redirectTarget: "https://attacker.example/member.html#loads",
    }),
    "/member.html#profile",
  );
});

test("sign-in reuses its CSRF seed, retains one forced retry, and has no delay", async () => {
  const source = await readFile(new URL("../dist/signin.html", import.meta.url), "utf8");
  assert.match(source, /let csrfSeedPromise = null;/);
  assert.match(source, /if \(!force && csrfSeedPromise\) return csrfSeedPromise;/);
  assert.match(source, /seedCsrfToken\(\{ force: true \}\)/);
  assert.doesNotMatch(source, /setTimeout\(resolve, 350\)/);
});

test("member startup renders before concurrent secondary data loading", async () => {
  const source = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");
  const accountLoad = source.indexOf("loadAccountState({ refreshLoads: false })");
  const firstRender = source.indexOf("renderProfile();", accountLoad);
  const concurrentLoads = source.indexOf("await Promise.allSettled(startupLoads);", accountLoad);
  assert.ok(accountLoad >= 0, "startup should skip the redundant load-board refresh");
  assert.ok(firstRender > accountLoad, "startup should render after account state arrives");
  assert.ok(concurrentLoads > firstRender, "secondary data should not block the first render");
});

test("member page cache-busts the corrected startup script", async () => {
  const source = await readFile(new URL("../dist/member.html", import.meta.url), "utf8");
  assert.match(source, /app\.js\?v=20260810-member-theme-6/);
});
