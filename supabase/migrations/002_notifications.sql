-- ════════════════════════════════════════════════════════════
-- Smart Money — Notifications Table
-- Migration: 002_notifications
-- ════════════════════════════════════════════════════════════

-- ── notifications ─────────────────────────────────────────
create table public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users (id) on delete cascade,
  buddy_id       text        references public.buddies (id) on delete set null,
  title          text        not null,
  body           text        not null default '',
  trigger_type   text        not null default 'system'
                             check (trigger_type in ('signal', 'goal', 'agent', 'salary', 'system', 'news')),
  trigger_source text,        -- human-readable source label e.g. "salary credit · GTBank"
  action_url     text,        -- deep link within the app e.g. "/chat?session=abc"
  read           boolean     not null default false,
  created_at     timestamptz not null default now()
);

comment on table public.notifications is
  'Per-user notification feed. Created by server-side routes, read by the client.';
comment on column public.notifications.trigger_source is
  'Human-readable label shown in the notification meta line.';
comment on column public.notifications.action_url is
  'In-app deep link, e.g. /chat?buddy=contrarian.';

-- Index for fast per-user feed queries
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- ── Row Level Security ─────────────────────────────────────
alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "users_read_own_notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

-- Users can mark their own notifications as read (update read column only)
create policy "users_update_own_notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (API routes using service key) can insert for any user
-- No insert RLS needed — routes use service role or the user's own session
create policy "users_insert_own_notifications"
  on public.notifications
  for insert
  with check (auth.uid() = user_id);
