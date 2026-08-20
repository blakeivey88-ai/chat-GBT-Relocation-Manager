import test from "node:test";
import assert from "node:assert/strict";

import {
  isTerminalLoadStatus,
  mergeLoadStatus,
  normalizeLifecycleStatus,
  syncMarketplaceLoadLifecycle,
  LOAD_STORE_KEY,
} from "../functions/lib/load-status-sync.js";

class MemoryKv {
  constructor() {
    this.values = new Map();
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
}

class MemoryD1 {
  constructor() {
    this.rows = new Map();
  }
  seed(loadId, status) {
    this.rows.set(loadId, { load_id: loadId, status });
  }
  prepare(sql) {
    const self = this;
    return {
      bind(...args) {
        return {
          async run() {
            // UPDATE loads SET status = ? WHERE load_id = ? AND (...)
            if (/UPDATE\s+loads/i.test(sql)) {
              const [status, loadId] = args;
              const row = self.rows.get(loadId);
              if (row) {
                row.status = status;
                self.rows.set(loadId, row);
              }
              return { success: true };
            }
            return { success: true };
          },
          async all() {
            return { results: [] };
          },
          async first() {
            return null;
          },
        };
      },
    };
  }
}

test("mergeLoadStatus never demotes delivered back to accepted", () => {
  assert.equal(mergeLoadStatus("delivered", "accepted"), "delivered");
  assert.equal(mergeLoadStatus("accepted", "delivered"), "delivered");
  assert.equal(mergeLoadStatus("open", "accepted"), "accepted");
  assert.equal(isTerminalLoadStatus("delivered"), true);
  assert.equal(isTerminalLoadStatus("accepted"), false);
});

test("normalizeLifecycleStatus maps messaging labels", () => {
  assert.equal(normalizeLifecycleStatus("Delivered"), "delivered");
  assert.equal(normalizeLifecycleStatus("In Transit"), "in_transit");
  assert.equal(normalizeLifecycleStatus("Empty"), "delivered");
});

test("syncMarketplaceLoadLifecycle updates KV and D1 together", async () => {
  const kv = new MemoryKv();
  const d1 = new MemoryD1();
  await kv.put(
    LOAD_STORE_KEY,
    JSON.stringify([
      {
        id: "load-sync-1",
        status: "accepted",
        acceptedByUserId: "usr_carrier",
        postedByUserId: "usr_shipper",
      },
    ]),
  );
  d1.seed("load-sync-1", "accepted");

  const result = await syncMarketplaceLoadLifecycle(
    { RELOCATION_MANAGER_LEADS: kv, RELOCATION_MANAGER_DB: d1 },
    {
      loadId: "load-sync-1",
      status: "Delivered",
      actorUserId: "usr_carrier",
      recordHistory: false,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "delivered");
  assert.equal(result.kvUpdated, true);

  const stored = JSON.parse(await kv.get(LOAD_STORE_KEY));
  assert.equal(stored[0].status, "delivered");
  assert.ok(stored[0].completedAt);
  assert.equal(d1.rows.get("load-sync-1").status, "delivered");
});

test("D1 accepted overlay would not win over KV delivered via merge", () => {
  // Simulates readMarketplaceLoads merge after a stale accepted row.
  assert.equal(mergeLoadStatus("delivered", "accepted"), "delivered");
});
