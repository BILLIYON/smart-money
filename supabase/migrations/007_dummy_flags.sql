-- ════════════════════════════════════════════════════════════
-- Smart Money — Dummy / Fixture Flags for Admin Cleanup
-- Migration: 007_dummy_flags
-- ════════════════════════════════════════════════════════════

-- Mark rows seeded as user-generated test data
alter table public.databank_entries
  add column if not exists is_dummy boolean not null default false;

-- Mark rows seeded as system fixture / demo data
alter table public.databank_entries
  add column if not exists is_fixture boolean not null default false;

comment on column public.databank_entries.is_dummy is
  'True for rows created as dummy/test data — cleared by admin Danger Zone.';
comment on column public.databank_entries.is_fixture is
  'True for rows seeded as DataBank demo fixtures — reset by admin Danger Zone.';
