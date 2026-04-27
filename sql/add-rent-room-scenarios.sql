CREATE TABLE IF NOT EXISTS rent_room_scenarios (
  id text PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  setup_json jsonb DEFAULT '{}'::jsonb,
  income_json jsonb DEFAULT '{}'::jsonb,
  costs_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rent_room_scenarios_user_id ON rent_room_scenarios(user_id);
