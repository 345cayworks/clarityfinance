CREATE TABLE IF NOT EXISTS rent_room_scenarios (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  title text,
  setup_json jsonb DEFAULT '{}'::jsonb,
  income_json jsonb DEFAULT '{}'::jsonb,
  costs_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  report_version text DEFAULT 'Clarity Report v1.0',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rent_room_scenarios_user_id ON rent_room_scenarios(user_id);
