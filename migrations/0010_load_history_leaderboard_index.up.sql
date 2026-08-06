-- Leaderboard performance: support the single grouped aggregation of verified,
-- completed load history used by /api/leaderboard
-- (readVerifiedCompletedCounts). Additive, index-only — no table or data change.
--
-- Query shape:
--   SELECT user_id, COUNT(*) FROM load_history
--    WHERE verified = 1 AND event_type = 'completed'
--    GROUP BY user_id;
-- Column order matches the equality filters first (event_type, verified) then
-- the GROUP BY key (user_id), letting SQLite/D1 satisfy it from the index.
CREATE INDEX IF NOT EXISTS idx_load_history_verified_completed
  ON load_history(event_type, verified, user_id);
