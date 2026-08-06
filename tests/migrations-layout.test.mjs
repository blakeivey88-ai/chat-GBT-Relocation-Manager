import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";

test("Wrangler migration directory contains forward migrations only", async () => {
  const names = await readdir(new URL("../migrations/", import.meta.url));
  const files = names.filter((name) => name.includes("."));
  assert.ok(files.length > 0);
  assert.ok(files.every((name) => name.endsWith(".up.sql")));
  assert.ok(files.includes("0001_core_schema.up.sql"));
  assert.ok(files.includes("0009_password_changed_at.up.sql"));
});
