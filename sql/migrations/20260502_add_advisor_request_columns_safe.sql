ALTER TABLE advisor_requests
ADD COLUMN IF NOT EXISTS advisor_notes text,
ADD COLUMN IF NOT EXISTS advisor_private_notes text,
ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS advisor_last_updated_at timestamptz;
