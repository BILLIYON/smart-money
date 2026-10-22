-- Phase 5 Migration: Partner Approvals Queue and Agentic Actions Bridge

-- 1. Update constraint on public.agent_actions.status to support partner oversight states
ALTER TABLE public.agent_actions
DROP CONSTRAINT IF EXISTS agent_actions_status_check;

ALTER TABLE public.agent_actions
ADD CONSTRAINT agent_actions_status_check
CHECK (status IN (
  'pending',
  'approved',
  'executed',
  'declined',
  'pending_partner_approval',
  'declined_by_partner',
  'cancelled'
));

-- 2. Add partner attribution and reasoning columns to public.agent_actions
ALTER TABLE public.agent_actions
ADD COLUMN IF NOT EXISTS partner_org_id uuid REFERENCES public.partner_orgs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reasoning text,
ADD COLUMN IF NOT EXISTS partner_decision_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS partner_decision_note text;

-- 3. Create indices for instant approvals queue filtering
CREATE INDEX IF NOT EXISTS idx_agent_actions_partner_pending
ON public.agent_actions (partner_org_id, status)
WHERE status = 'pending_partner_approval';
