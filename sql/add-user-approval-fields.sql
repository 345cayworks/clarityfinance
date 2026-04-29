ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

UPDATE users
SET approval_status = 'approved'
WHERE approval_status IS NULL;
