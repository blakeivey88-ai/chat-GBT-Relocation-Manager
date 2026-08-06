// Leaderboard "load every remaining page" controller.
//
// Framework-free and dependency-injected so it can be unit tested in Node and
// reused by app.js in the browser. Guarantees:
//   1. One shared in-flight promise — concurrent callers await the same run.
//   2. loadNextPage reports success/progress; the controller returns a summary.
//   3. Stops immediately after ONE failed or no-progress page request. It never
//      retries in a loop, so a transient failure can't spin thousands of times;
//      the caller keeps a safe manual retry path (call loadAll() again).
export function createLeaderboardLoader({ hasMore, loadNextPage }) {
  let inflight = null;

  async function run() {
    let pagesAttempted = 0;
    let stoppedForError = false;
    while (hasMore()) {
      let result;
      try {
        // Expected shape: { ok: boolean, progressed: boolean, added: number }
        result = await loadNextPage();
      } catch {
        result = { ok: false, progressed: false, added: 0 };
      }
      pagesAttempted += 1;
      if (!result || result.ok !== true) {
        stoppedForError = true;
        break; // one attempt at a failing page — never retry in a loop
      }
      if (result.progressed !== true) {
        break; // no forward progress — stop rather than spin
      }
    }
    return { pagesAttempted, complete: !hasMore(), stoppedForError };
  }

  function loadAll() {
    if (inflight) return inflight; // shared in-flight promise
    inflight = run().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  return { loadAll, isLoading: () => inflight !== null };
}

if (typeof window !== "undefined") {
  window.RMLeaderboardPaging = { createLeaderboardLoader };
}
