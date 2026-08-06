PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  mc_dot TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  equipment_type TEXT NOT NULL DEFAULT '',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  additional_languages TEXT NOT NULL DEFAULT '[]',
  preferred_translation_language TEXT NOT NULL DEFAULT 'en',
  auto_translate_messages INTEGER NOT NULL DEFAULT 0,
  always_show_original_messages INTEGER NOT NULL DEFAULT 1,
  transcribe_and_translate_voice_notes INTEGER NOT NULL DEFAULT 1,
  show_languages_spoken INTEGER NOT NULL DEFAULT 0,
  verification TEXT NOT NULL DEFAULT 'Not verified',
  note TEXT NOT NULL DEFAULT '',
  password_salt TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  email_verified_at TEXT NOT NULL DEFAULT '',
  email_verification_sent_at TEXT NOT NULL DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT 'unpaid_waitlist',
  subscription_status TEXT NOT NULL DEFAULT 'unpaid',
  subscription_access TEXT NOT NULL DEFAULT 'claim',
  paid_at TEXT NOT NULL DEFAULT '',
  plan_label TEXT NOT NULL DEFAULT '',
  stripe_customer_id TEXT NOT NULL DEFAULT '',
  stripe_subscription_id TEXT NOT NULL DEFAULT '',
  stripe_session_id TEXT NOT NULL DEFAULT '',
  stripe_last_event_created_at TEXT NOT NULL DEFAULT '',
  stripe_last_event_id TEXT NOT NULL DEFAULT '',
  stripe_last_event_type TEXT NOT NULL DEFAULT '',
  subscription_current_period_end TEXT NOT NULL DEFAULT '',
  subscription_grace_until TEXT NOT NULL DEFAULT '',
  subscription_canceled_at TEXT NOT NULL DEFAULT '',
  subscription_cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  subscription_trial_allowed INTEGER NOT NULL DEFAULT 0,
  truck_count INTEGER NOT NULL DEFAULT 0,
  load_access TEXT NOT NULL DEFAULT 'claim',
  tags TEXT NOT NULL DEFAULT '[]',
  recent_loads TEXT NOT NULL DEFAULT '[]',
  recent_requests TEXT NOT NULL DEFAULT '[]',
  request_bids TEXT NOT NULL DEFAULT '{}',
  messages TEXT NOT NULL DEFAULT '[]',
  planned_trips TEXT NOT NULL DEFAULT '[]',
  active_pickups TEXT NOT NULL DEFAULT '[]',
  lane_alerts TEXT NOT NULL DEFAULT '[]',
  customer_ratings TEXT NOT NULL DEFAULT '[]',
  trust_disputes TEXT NOT NULL DEFAULT '[]',
  trust_audit TEXT NOT NULL DEFAULT '[]',
  notifications TEXT NOT NULL DEFAULT '[]',
  notification_preferences TEXT NOT NULL DEFAULT '{}',
  communication_privacy TEXT NOT NULL DEFAULT '{}',
  equipment_types TEXT NOT NULL DEFAULT '[]',
  avatar_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  checkout_plan TEXT NOT NULL DEFAULT '',
  profile_view TEXT NOT NULL DEFAULT 'driver',
  access_code TEXT NOT NULL DEFAULT '',
  access_code_hint TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_stripe_customer_id ON accounts(stripe_customer_id) WHERE stripe_customer_id <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_stripe_subscription_id ON accounts(stripe_subscription_id) WHERE stripe_subscription_id <> '';

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS roles (
  role_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_roles_user_id ON roles(user_id);

CREATE TABLE IF NOT EXISTS companies (
  company_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  legal_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  mc_dot TEXT NOT NULL DEFAULT '',
  insurance_status TEXT NOT NULL DEFAULT 'Pending',
  authority_status TEXT NOT NULL DEFAULT 'Pending',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

CREATE TABLE IF NOT EXISTS equipment (
  equipment_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  specs TEXT NOT NULL DEFAULT '{}',
  photos TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);

CREATE TABLE IF NOT EXISTS loads (
  load_id TEXT PRIMARY KEY,
  posted_by_user_id TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  weight TEXT NOT NULL DEFAULT '',
  rate TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by_user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_loads_posted_by_user_id ON loads(posted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);

CREATE TABLE IF NOT EXISTS load_requests (
  load_request_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pickup_city TEXT NOT NULL DEFAULT '',
  delivery_city TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_load_requests_user_id ON load_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_load_requests_status ON load_requests(status);

CREATE TABLE IF NOT EXISTS lane_alerts (
  lane_alert_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  min_rate TEXT NOT NULL DEFAULT '',
  notification_preferences TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lane_alerts_user_id ON lane_alerts(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  lane TEXT NOT NULL DEFAULT '',
  channels TEXT NOT NULL DEFAULT '{}',
  read_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

CREATE TABLE IF NOT EXISTS carrier_verifications (
  carrier_verification_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  carrier_name TEXT NOT NULL DEFAULT '',
  mc_dot TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  load_id TEXT NOT NULL DEFAULT '',
  checklist TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_user_id ON carrier_verifications(user_id);

CREATE TABLE IF NOT EXISTS trusted_partners (
  trusted_partner_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  service_area TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trusted_partners_category ON trusted_partners(category);

CREATE TABLE IF NOT EXISTS partner_reports (
  partner_report_id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  partner_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Needs review',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_partner_reports_partner_id ON partner_reports(partner_id);

CREATE TABLE IF NOT EXISTS trust_entries (
  trust_entry_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  verified_source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  verified_event_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trust_entries_user_id ON trust_entries(user_id);

CREATE TABLE IF NOT EXISTS trust_disputes (
  trust_dispute_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  load_id TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trust_disputes_user_id ON trust_disputes(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id TEXT PRIMARY KEY,
  verified_event_ref TEXT NOT NULL,
  actor_user_id TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user_id ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);
