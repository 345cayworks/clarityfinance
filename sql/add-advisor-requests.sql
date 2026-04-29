CREATE TABLE IF NOT EXISTS advisor_requests (
  id text primary key,
  user_id text references users(id) on delete cascade,
  name text,
  email text,
  phone text,
  preferred_contact_method text,
  topic text,
  urgency text,
  message text,
  consent_to_review boolean default false,
  status text default 'new',
  source_context text,
  recommendation_json jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
