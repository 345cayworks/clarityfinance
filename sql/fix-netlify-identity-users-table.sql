-- Fix for Netlify Identity migration
-- Problem: old custom-auth schema required users.password_hash NOT NULL.
-- Netlify Identity users do not have app-managed password hashes, so profile-save fails with:
-- null value in column "password_hash" of relation "users" violates not-null constraint

-- Safe immediate fix: allow existing column to be nullable if it exists.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Optional cleanup after confirming Netlify Identity is the only auth system:
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
-- DROP TABLE IF EXISTS password_reset_tokens;

-- Ensure users table supports Netlify Identity fields.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
