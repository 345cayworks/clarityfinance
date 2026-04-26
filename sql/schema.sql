CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE,
  name text,
  role text DEFAULT 'user',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  country_or_market text,
  preferred_currency text,
  age_range text,
  employment_type text,
  household_status text,
  dependents integer,
  credit_score_known boolean DEFAULT false,
  credit_score_or_profile text,
  customer_name text,
  date_of_birth text,
  physical_address text,
  employer text,
  job_title text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS income_sources (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  type text,
  label text,
  monthly_amount numeric DEFAULT 0,
  frequency text DEFAULT 'monthly',
  stability text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_profiles (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  housing numeric DEFAULT 0,
  utilities numeric DEFAULT 0,
  transport numeric DEFAULT 0,
  groceries numeric DEFAULT 0,
  insurance numeric DEFAULT 0,
  childcare numeric DEFAULT 0,
  discretionary numeric DEFAULT 0,
  other numeric DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debts (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  name text,
  type text,
  balance numeric DEFAULT 0,
  interest_rate numeric DEFAULT 0,
  monthly_payment numeric DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS housing_profiles (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  housing_status text,
  rent_amount numeric,
  mortgage_balance numeric,
  mortgage_rate numeric,
  mortgage_payment numeric,
  estimated_home_value numeric,
  spare_room_available boolean,
  estimated_room_rental_income numeric,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS savings_profiles (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  cash_savings numeric DEFAULT 0,
  emergency_fund numeric DEFAULT 0,
  investments numeric DEFAULT 0,
  retirement_savings numeric DEFAULT 0,
  down_payment_savings numeric DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  target_goal text,
  target_home_price numeric,
  target_savings_goal numeric,
  target_debt_reduction numeric,
  target_monthly_cash_flow numeric,
  goal_timeframe text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  name text,
  adjustments_json jsonb,
  result_json jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_plans (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  name text,
  thirty_day_json jsonb,
  ninety_day_json jsonb,
  twelve_month_json jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  title text,
  report_json jsonb,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_profiles_user_id ON expense_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_housing_profiles_user_id ON housing_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_profiles_user_id ON savings_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_user_id ON action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
