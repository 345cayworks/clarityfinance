ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'inactive', 'deactivated'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_approval_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS advisor_requests (
  id text PRIMARY KEY,
  user_id text,
  name text,
  email text,
  phone text,
  topic text,
  urgency text,
  message text,
  status text DEFAULT 'new',
  consent_to_review boolean DEFAULT false,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);
