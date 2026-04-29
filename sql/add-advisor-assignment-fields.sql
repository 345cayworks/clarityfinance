ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS assigned_advisor_id text;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS assigned_advisor_email text;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS assigned_at timestamp;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS assigned_by text;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS prequalification_shared boolean DEFAULT false;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS prequalification_share_url text;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS advisor_notes text;
ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS advisor_last_updated_at timestamp;

CREATE INDEX IF NOT EXISTS idx_advisor_requests_assigned_advisor_id ON advisor_requests(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_requests_assigned_advisor_email ON advisor_requests(assigned_advisor_email);
