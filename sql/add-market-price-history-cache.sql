CREATE TABLE IF NOT EXISTS market_price_history (
  ticker TEXT NOT NULL,
  price_date DATE NOT NULL,
  close_price NUMERIC,
  adjusted_close_price NUMERIC,
  dividend_amount NUMERIC,
  split_coefficient NUMERIC,
  source TEXT NOT NULL DEFAULT 'alpha_vantage',
  fetched_at TIMESTAMP DEFAULT now(),
  raw_json JSONB,
  PRIMARY KEY (ticker, price_date)
);

CREATE TABLE IF NOT EXISTS market_data_sync_status (
  ticker TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'alpha_vantage',
  last_full_refresh_at TIMESTAMP,
  last_trading_date_cached DATE,
  status TEXT NOT NULL DEFAULT 'never_synced',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_price_history_ticker_date
  ON market_price_history(ticker, price_date DESC);

CREATE INDEX IF NOT EXISTS idx_market_data_sync_status_updated
  ON market_data_sync_status(updated_at DESC);
