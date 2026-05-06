CREATE TABLE IF NOT EXISTS data_sharing_consents (
  id text PRIMARY KEY,
  user_id text,
  recipient_type text,
  recipient_name text,
  source_context text,
  artifact_id text,
  consent_text text,
  consent_version text,
  shared_scope_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_sharing_consents_user_id ON data_sharing_consents(user_id);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_version text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS generated_at timestamp;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assumptions_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS disclaimer_text text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_context text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS based_on_user_entered_data boolean DEFAULT true;
