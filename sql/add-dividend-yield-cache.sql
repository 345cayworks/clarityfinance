CREATE TABLE IF NOT EXISTS dividend_yield_cache (
  ticker TEXT PRIMARY KEY,
  company_name TEXT,
  dividend_yield_percent NUMERIC,
  annual_dividend_per_share NUMERIC,
  payout_frequency TEXT,
  source TEXT NOT NULL DEFAULT 'manual_or_provider',
  raw_json JSONB,
  fetched_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_expires_at
  ON dividend_yield_cache(expires_at);
