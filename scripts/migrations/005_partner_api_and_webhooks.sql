-- Phase 7 Migration: Partner API Keys and Webhooks

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Primary Production Key',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW(),
  revoked_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_partner_api_keys_org
ON public.partner_api_keys (partner_org_id);

CREATE INDEX IF NOT EXISTS idx_partner_api_keys_hash
ON public.partner_api_keys (key_hash)
WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.partner_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['client.joined', 'action.threshold', 'goal.created'],
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_webhooks_org
ON public.partner_webhooks (partner_org_id);
