CREATE TABLE IF NOT EXISTS notification_logs (
  id text PRIMARY KEY,
  user_id text NULL,
  recipient_email text NOT NULL,
  recipient_phone text NULL,
  channel text NOT NULL,
  event_type text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL,
  provider_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT false,
  phone text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
