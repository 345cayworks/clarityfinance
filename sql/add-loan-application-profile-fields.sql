ALTER TABLE profiles ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS physical_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
