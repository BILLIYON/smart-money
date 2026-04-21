-- ════════════════════════════════════════════════════════════
-- Smart Money — Admin Role
-- Migration: 005_admin_role
-- ════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists is_admin boolean not null default false;

comment on column public.users.is_admin is
  'Grants access to the /admin dashboard. Set manually via service role.';
