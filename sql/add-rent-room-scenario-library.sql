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

ALTER TABLE rent_room_scenarios DROP CONSTRAINT IF EXISTS rent_room_scenarios_user_id_key;

DROP INDEX IF EXISTS idx_rent_room_scenarios_user_id_unique;

ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE rent_room_scenarios ADD COLUMN IF NOT EXISTS report_version text DEFAULT 'Clarity Report v1.0';

UPDATE rent_room_scenarios
SET title = 'Rent-a-Room Scenario - ' || to_char(COALESCE(created_at, now()), 'YYYY-MM-DD')
WHERE title IS NULL OR btrim(title) = '';

CREATE INDEX IF NOT EXISTS idx_rent_room_scenarios_user_updated
ON rent_room_scenarios(user_id, updated_at DESC);
