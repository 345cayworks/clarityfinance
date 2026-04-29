ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS other_assets numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS source_of_down_payment text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purchase_price numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS borrower_contribution numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS security_offered text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS security_value numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_tax_returns boolean;
