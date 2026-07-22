PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS verified_transactions (
  verified_transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  load_id TEXT NOT NULL DEFAULT '',
  review_target_type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 1,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewer_user_id TEXT NOT NULL DEFAULT '',
  reviewer_name TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_verified_transactions_user_id ON verified_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_transactions_load_id ON verified_transactions(load_id);
