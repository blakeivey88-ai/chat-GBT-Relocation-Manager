PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trust_score_history (
  trust_score_history_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  old_score INTEGER NOT NULL DEFAULT 0,
  new_score INTEGER NOT NULL DEFAULT 0,
  delta INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  verified_event_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_user_id ON trust_score_history(user_id);

CREATE TABLE IF NOT EXISTS score_category_breakdowns (
  breakdown_id TEXT PRIMARY KEY,
  trust_score_history_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_score_category_breakdowns_user_id ON score_category_breakdowns(user_id);

CREATE TABLE IF NOT EXISTS badges (
  badge_id TEXT PRIMARY KEY,
  badge_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  unlock_rules TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_badge_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  progress TEXT NOT NULL DEFAULT '{}',
  locked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

CREATE TABLE IF NOT EXISTS rewards (
  reward_id TEXT PRIMARY KEY,
  reward_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  unlock_rules TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_rewards (
  user_reward_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked',
  unlocked_at TEXT NOT NULL DEFAULT '',
  progress TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);

CREATE TABLE IF NOT EXISTS reviews (
  review_id TEXT PRIMARY KEY,
  reviewer_user_id TEXT NOT NULL,
  reviewed_user_id TEXT NOT NULL,
  load_id TEXT NOT NULL DEFAULT '',
  review_type TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_user_id) REFERENCES accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_load_id ON reviews(load_id);

CREATE TABLE IF NOT EXISTS review_answers (
  review_answer_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  question_key TEXT NOT NULL DEFAULT '',
  answer_value TEXT NOT NULL DEFAULT '',
  answer_label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_review_answers_review_id ON review_answers(review_id);

CREATE TABLE IF NOT EXISTS disputes (
  dispute_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL DEFAULT '',
  load_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);

CREATE TABLE IF NOT EXISTS dispute_evidence (
  dispute_evidence_id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT '',
  file_ref TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispute_id) REFERENCES disputes(dispute_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

CREATE TABLE IF NOT EXISTS claims (
  claim_id TEXT PRIMARY KEY,
  load_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL,
  claim_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  amount TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_load_id ON claims(load_id);

CREATE TABLE IF NOT EXISTS verification_records (
  verification_record_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  verified_source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  verified_event_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_verification_records_user_id ON verification_records(user_id);

CREATE TABLE IF NOT EXISTS fraud_flags (
  fraud_flag_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_key TEXT NOT NULL DEFAULT '',
  signal_type TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_user_id ON fraud_flags(user_id);

CREATE TABLE IF NOT EXISTS administrative_actions (
  admin_action_id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_administrative_actions_admin_user_id ON administrative_actions(admin_user_id);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  rank INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  verified_loads INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_scope ON leaderboard_snapshots(scope, role, equipment);
