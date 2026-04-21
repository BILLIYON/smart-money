CREATE TABLE user_integrations (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES users(id) ON DELETE CASCADE,
  provider      text        NOT NULL,  -- "gmail" | "openbanking"
  access_token  text,                  -- AES-256 encrypted
  refresh_token text,                  -- AES-256 encrypted
  token_expiry  timestamptz,
  connected_at  timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  scopes        text[],
  metadata      jsonb,                 -- provider-specific data
  UNIQUE (user_id, provider)
);

-- RLS: users can only see their own integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own integrations only"
  ON user_integrations
  USING (auth.uid() = user_id);
