ALTER TABLE accounts ADD COLUMN insurance_provider TEXT NOT NULL DEFAULT '';
ALTER TABLE accounts ADD COLUMN insurance_policy_last4 TEXT NOT NULL DEFAULT '';
ALTER TABLE accounts ADD COLUMN insurance_expiration TEXT NOT NULL DEFAULT '';
ALTER TABLE accounts ADD COLUMN insurance_document_url TEXT NOT NULL DEFAULT '';
ALTER TABLE accounts ADD COLUMN insurance_status TEXT NOT NULL DEFAULT 'Not submitted';
