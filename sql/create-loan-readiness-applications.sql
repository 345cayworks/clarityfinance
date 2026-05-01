CREATE TABLE IF NOT EXISTS loan_readiness_applications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  preferred_lender text,
  loan_type text,
  loan_purpose text,
  requested_amount numeric,
  purchase_price numeric,
  down_payment_available numeric,
  loan_term_years numeric,
  estimated_interest_rate numeric,
  readiness_score numeric,
  readiness_band text,
  debt_to_income numeric,
  housing_ratio numeric,
  monthly_income numeric,
  monthly_expenses numeric,
  monthly_debt_payments numeric,
  monthly_surplus numeric,
  missing_documents_json jsonb DEFAULT '[]'::jsonb,
  checklist_json jsonb DEFAULT '{}'::jsonb,
  application_json jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft','ready_for_review','advisor_review','exported','closed')),
  advisor_request_id text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_readiness_user_updated ON loan_readiness_applications (user_id, updated_at DESC);
