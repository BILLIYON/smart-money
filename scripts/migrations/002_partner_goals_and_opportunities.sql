-- Phase 4 Migration: Partner Goals and Opportunities Engine

-- 1. Alter public.goals with partner origin and acceptance fields
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS origin text DEFAULT 'client',
ADD COLUMN IF NOT EXISTS origin_partner_org_id uuid REFERENCES public.partner_orgs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS advisor_note text,
ADD COLUMN IF NOT EXISTS requires_acceptance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE public.goals ADD CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'pending_acceptance', 'declined'));

-- 2. Create public.opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id uuid REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Investment',
  source text NOT NULL DEFAULT 'partner',
  source_name text NOT NULL DEFAULT 'Wealth Advisor',
  source_avatar text DEFAULT '🏛️',
  source_color text DEFAULT 'linear-gradient(135deg,#0B1E3D,#1A3A6E)',
  reasoning text NOT NULL,
  value_estimate text,
  status text NOT NULL DEFAULT 'active',
  window_label text DEFAULT 'Reassess weekly',
  min_investment_kobo bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Indexing for rapid queries
CREATE INDEX IF NOT EXISTS idx_opportunities_user_status ON public.opportunities (user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_partner ON public.opportunities (partner_org_id);
CREATE INDEX IF NOT EXISTS idx_goals_origin_partner ON public.goals (origin_partner_org_id);
