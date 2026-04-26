-- Fix for Netlify Identity migration
-- Problem: old custom-auth schema may still have constraints/defaults that conflict with Netlify Identity.
-- Netlify Identity users do not have app-managed password hashes.

-- Ensure users table supports Netlify Identity fields.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Ensure timestamp columns have defaults and are populated for old rows.
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
UPDATE users SET created_at = now() WHERE created_at IS NULL;
UPDATE users SET updated_at = now() WHERE updated_at IS NULL;

-- Optional cleanup after confirming Netlify Identity is the only auth system.
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
DROP TABLE IF EXISTS password_reset_tokens;
