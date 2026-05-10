CREATE TABLE IF NOT EXISTS dividend_yield_cache (
  ticker TEXT PRIMARY KEY,
  company_name TEXT,
  dividend_yield_percent NUMERIC,
  annual_dividend_per_share NUMERIC,
  current_price NUMERIC,
  payout_frequency TEXT,
  source TEXT NOT NULL DEFAULT 'massive',
  raw_json JSONB,
  fetched_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE dividend_yield_cache
  ADD COLUMN IF NOT EXISTS current_price NUMERIC;

CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_expires_at
  ON dividend_yield_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_ticker
  ON dividend_yield_cache(ticker);

CREATE INDEX IF NOT EXISTS idx_dividend_yield_cache_fetched_at
  ON dividend_yield_cache(fetched_at);
