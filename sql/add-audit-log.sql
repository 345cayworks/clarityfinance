CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id text,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  target_user_id text,
  target_email text,
  target_type text,
  target_id text,
  entity_type text,
  entity_id text,
  source_function text,
  metadata jsonb DEFAULT '{}'::jsonb,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_user_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_email text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source_function text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_email ON audit_logs(target_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_id ON audit_logs(target_type, target_id);
