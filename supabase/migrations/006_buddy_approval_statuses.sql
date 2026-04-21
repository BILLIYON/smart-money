-- ════════════════════════════════════════════════════════════
-- Smart Money — Buddy Approval Statuses
-- Migration: 006_buddy_approval_statuses
-- ════════════════════════════════════════════════════════════

-- Drop the old inline check constraint (auto-named by Postgres)
alter table public.buddies
  drop constraint if exists buddies_status_check;

-- Expand allowed statuses:
--   live     → published and visible in marketplace
--   pending  → submitted by creator, awaiting admin review (was 'review')
--   approved → admin approved, ready to go live
--   rejected → admin rejected
--   draft    → creator has not yet submitted
alter table public.buddies
  add constraint buddies_status_check
  check (status in ('live', 'pending', 'approved', 'rejected', 'draft'));

-- Migrate any existing 'review' rows to 'pending'
update public.buddies set status = 'pending' where status = 'review';

-- Store rejection reason alongside rejected buddies
alter table public.buddies
  add column if not exists rejection_reason text;

comment on column public.buddies.rejection_reason is
  'Admin-supplied reason when status = ''rejected''.';
