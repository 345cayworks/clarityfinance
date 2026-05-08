CREATE TABLE IF NOT EXISTS dividend_calculator_saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  positions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  projection_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_version TEXT DEFAULT 'Clarity Report v1.0',
  disclaimer_text TEXT,
  assumptions_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dividend_calculator_saves_user_updated
  ON dividend_calculator_saves(user_id, updated_at DESC);
