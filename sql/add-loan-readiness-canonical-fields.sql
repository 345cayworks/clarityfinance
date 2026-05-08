ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS non_housing_living_expenses numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS housing_payment numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS total_monthly_obligations numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS total_obligations_ratio numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS monthly_income_source text;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS savings_runway_months numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS down_payment_percent numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS raw_readiness_score numeric;
ALTER TABLE loan_readiness_applications ADD COLUMN IF NOT EXISTS max_readiness_score numeric DEFAULT 100;
