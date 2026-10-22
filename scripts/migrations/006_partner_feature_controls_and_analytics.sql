-- Phase 8 Migration: Partner Feature Controls and Custom Analytics Rules

-- 1. Feature toggles table
CREATE TABLE IF NOT EXISTS public.partner_feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT NOW(),
  CONSTRAINT uq_partner_feature_key UNIQUE (partner_org_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_partner_feature_toggles_org
ON public.partner_feature_toggles (partner_org_id);

-- 2. Custom analytics calculation rules
CREATE TABLE IF NOT EXISTS public.partner_analytics_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  formula text NOT NULL,
  icon text DEFAULT '⚙️',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_analytics_rules_org
ON public.partner_analytics_rules (partner_org_id);

-- 3. Category inclusion / exclusion toggles
CREATE TABLE IF NOT EXISTS public.partner_analytics_category_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  description text,
  is_included boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT NOW(),
  CONSTRAINT uq_partner_category_toggle UNIQUE (partner_org_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_partner_category_toggles_org
ON public.partner_analytics_category_toggles (partner_org_id);

-- 4. Seed default feature toggles for Stanbic Wealth
INSERT INTO public.partner_feature_toggles (partner_org_id, feature_key, name, description, is_enabled)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'marketplace', 'Marketplace & Public Buddies', 'Allow clients to browse and subscribe to external AI Finance Buddies.', true),
  ('a0000000-0000-0000-0000-000000000001', 'agentic_actions', 'Agentic Autonomous Execution', 'Allow clients to initiate AI agentic actions (subject to your approval threshold).', true),
  ('a0000000-0000-0000-0000-000000000001', 'gamification', 'DataBank Arcade & Badges', 'Show streaks, XP, level badges, and the gamified DataBank Cleaner.', true),
  ('a0000000-0000-0000-0000-000000000001', 'ai_studio', 'AI Studio Access', 'Allow clients to create and train their own custom AI Finance Buddies.', false)
ON CONFLICT (partner_org_id, feature_key) DO NOTHING;

-- 5. Seed default analytics rules for Stanbic Wealth
INSERT INTO public.partner_analytics_rules (partner_org_id, rule_name, formula, icon, is_enabled)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'True Savings Rate', 'Net Inflow to Savings & Investments ÷ Gross Liquid Inflow', '📐', true),
  ('a0000000-0000-0000-0000-000000000001', 'Debt-to-Income (DTI)', 'Monthly Debt Servicing ÷ Verified Monthly Cashflow', '⚖️', true),
  ('a0000000-0000-0000-0000-000000000001', 'Emergency Runway Months', 'Liquid Cash ÷ Trailing 3-Month Average Non-Discretionary Spend', '🛡️', true)
ON CONFLICT DO NOTHING;

-- 6. Seed category toggles for Stanbic Wealth
INSERT INTO public.partner_analytics_category_toggles (partner_org_id, category_name, description, is_included)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Internal Transfer Neutrality', 'Exclude own-account transfers (e.g., GTBank to Zenith) from spending calculations.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Crypto & Digital Assets', 'Count P2P and exchange deposits as investment inflows rather than expenses.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Gambling & High-Risk Outflows', 'Isolate sports betting and lottery into dedicated high-risk flag.', true)
ON CONFLICT (partner_org_id, category_name) DO NOTHING;
