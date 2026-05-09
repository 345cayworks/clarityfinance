CREATE TABLE IF NOT EXISTS monthly_budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_month TEXT NOT NULL,
  title TEXT NOT NULL,
  income_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  expenses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_budgets_user_month
ON monthly_budgets(user_id, budget_month);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_updated
ON monthly_budgets(user_id, updated_at DESC);
