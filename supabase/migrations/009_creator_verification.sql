-- ════════════════════════════════════════════════════════════
-- Smart Money — Migration 009: Creator Identity Verification
-- ════════════════════════════════════════════════════════════

-- Add identity verification columns to users table
alter table public.users
  add column if not exists is_verified        boolean     not null default false,
  add column if not exists verified_at        timestamptz,
  add column if not exists verification_name  text,
  add column if not exists verification_nin   text;  -- stored masked after verify

comment on column public.users.is_verified is
  'True once the creator has submitted and had their identity verified.';
comment on column public.users.verification_name is
  'Full name as submitted during identity verification.';
comment on column public.users.verification_nin is
  'Masked NIN / BVN reference stored after submission (first 3 chars + ***** + last 2).';

-- Add revenue-related columns to buddies for creator dashboard aggregation
alter table public.buddies
  add column if not exists price_monthly_ngn  integer  not null default 0,
  add column if not exists creator_share_pct  integer  not null default 70;

comment on column public.buddies.price_monthly_ngn is
  'Monthly subscription price in Naira (display convenience, derived from price_monthly/100).';
comment on column public.buddies.creator_share_pct is
  'Percentage of gross revenue the creator keeps (default 70%).';
