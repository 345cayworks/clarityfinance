ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE expense_profiles ADD COLUMN IF NOT EXISTS entertainment numeric DEFAULT 0;
ALTER TABLE expense_profiles ADD COLUMN IF NOT EXISTS travel numeric DEFAULT 0;
ALTER TABLE expense_profiles ADD COLUMN IF NOT EXISTS water numeric DEFAULT 0;
