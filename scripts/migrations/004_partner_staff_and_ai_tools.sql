-- Phase 6 Migration: Partner Staff, AI Buddies, and Escalation Rules

-- 1. Alter public.buddies with partner ownership and escalation
ALTER TABLE public.buddies
ADD COLUMN IF NOT EXISTS owner_partner_org_id uuid REFERENCES public.partner_orgs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
ADD COLUMN IF NOT EXISTS escalates_to_staff_id uuid REFERENCES public.partner_staff(id) ON DELETE SET NULL;

-- 2. Create public.partner_escalation_rules table
CREATE TABLE IF NOT EXISTS public.partner_escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'portfolio_size',
  trigger_label text NOT NULL,
  trigger_value text NOT NULL,
  target_role_or_staff text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_escalation_org
ON public.partner_escalation_rules (partner_org_id);

-- 3. Seed default escalation rules for the initial wealth partner
INSERT INTO public.partner_escalation_rules (
  partner_org_id, trigger_type, trigger_label, trigger_value, target_role_or_staff, is_enabled
)
SELECT 
  id,
  'portfolio_size',
  'Portfolio value',
  '> ₦50M',
  'Senior Wealth Advisor',
  true
FROM public.partner_orgs
WHERE slug = 'meristem-wealth'
ON CONFLICT DO NOTHING;

INSERT INTO public.partner_escalation_rules (
  partner_org_id, trigger_type, trigger_label, trigger_value, target_role_or_staff, is_enabled
)
SELECT 
  id,
  'risk_signal',
  'Risk signal',
  'Drawdown > 15%',
  'Assigned Advisor',
  true
FROM public.partner_orgs
WHERE slug = 'meristem-wealth'
ON CONFLICT DO NOTHING;

INSERT INTO public.partner_escalation_rules (
  partner_org_id, trigger_type, trigger_label, trigger_value, target_role_or_staff, is_enabled
)
SELECT 
  id,
  'keyword',
  'Client chat',
  'Talk to human',
  'Any Online Advisor',
  true
FROM public.partner_orgs
WHERE slug = 'meristem-wealth'
ON CONFLICT DO NOTHING;
