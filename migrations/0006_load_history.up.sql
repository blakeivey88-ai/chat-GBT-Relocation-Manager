PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS load_history (
  load_history_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  load_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'activity',
  participant_role TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  counterparty_name TEXT NOT NULL DEFAULT '',
  rate TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_load_history_user_date
  ON load_history(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_load_history_load_id
  ON load_history(load_id);
