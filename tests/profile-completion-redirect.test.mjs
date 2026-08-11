import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");

test("signed-in profile edits do not require a second password", () => {
  assert.match(
    source,
    /profile\?\.memberAccess\?\.authenticated && profile\?\.userId/,
  );
  assert.doesNotMatch(
    source,
    /profile\?\.memberAccess\?\.authenticated &&\s*profile\?\.userId &&\s*!isProfileCompleteState\(profile\)/,
  );
  assert.match(source, /action: "complete-profile"/);
  assert.match(source, /passwordLabel\.hidden = true/);
  assert.match(source, /passwordLabel\.style\.display = "none"/);
  assert.match(source, /title\.textContent = "Edit company details"/);
});

test("member styles cannot override the hidden password label", async () => {
  const styles = await readFile(new URL("../dist/styles.css", import.meta.url), "utf8");
  assert.match(
    styles,
    /\.form-card label\[hidden\]\s*\{\s*display:\s*none\s*!important;/,
  );
});

test("member page loads a unique password-removal override", async () => {
  const [member, override] = await Promise.all([
    readFile(new URL("../dist/member.html", import.meta.url), "utf8"),
    readFile(
      new URL("../dist/profile-edit-password-fix-20260810.css", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(member, /profile-edit-password-fix-20260810\.css/);
  assert.match(override, /#signupForm\[data-mode="complete-profile"\] #signupPasswordLabel/);
  assert.match(override, /display:\s*none\s*!important/);
});

test("profile saves return to the interrupted profile or load-post route", () => {
  assert.match(source, /let accountSetupReturnRoute = ""/);
  assert.match(source, /\["post", "profile", "workbench"\]\.includes\(returnRoute\)/);
  assert.match(source, /accountSetupReturnRoute \|\| "profile"/);
});

test("an existing-account response preserves entered profile fields", () => {
  assert.match(source, /Your entries are still here/);
  assert.doesNotMatch(
    source,
    /That account already exists\. Opening sign in\.[\s\S]{0,160}location\.href = String\(err\.data\.signInPath\)/,
  );
});
