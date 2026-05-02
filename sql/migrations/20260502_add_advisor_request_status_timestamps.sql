ALTER TABLE advisor_requests
ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;
