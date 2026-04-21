-- ════════════════════════════════════════════════════════════
-- Smart Money — Initial Schema
-- Migration: 001_initial
-- ════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════

-- ── users ─────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific profile data.
create table public.users (
  id                  uuid        primary key references auth.users (id) on delete cascade,
  full_name           text,
  email               text,
  currency            text        not null default 'NGN',
  primary_goal        text,
  risk_tolerance      text,
  income_range        text,
  onboarding_complete boolean     not null default false,
  plan                text        not null default 'free'
                                  check (plan in ('free', 'pro')),
  created_at          timestamptz not null default now()
);

comment on table public.users is
  'App-level user profile extending auth.users.';

-- ── buddies ───────────────────────────────────────────────
-- AI Finance Buddy catalogue — publicly readable.
create table public.buddies (
  id              text        primary key,  -- e.g. "contrarian", "buffett"
  name            text        not null,
  tag             text,
  description     text,
  philosophy      text,
  price_monthly   integer     not null default 0,  -- kobo (0 = free)
  ai_model        text        not null default 'claude'
                              check (ai_model in ('claude', 'gpt4', 'gemini')),
  banner_color    text,
  avatar_bg       text,
  avatar_content  text,
  rating          numeric(3,2) not null default 0,
  review_count    integer     not null default 0,
  is_fan_sim      boolean     not null default false,
  fan_disclaimer  text,
  creator_id      uuid        references public.users (id) on delete set null,
  status          text        not null default 'live'
                              check (status in ('live', 'review', 'draft')),
  category        text[],
  created_at      timestamptz not null default now()
);

comment on table public.buddies is
  'AI Finance Buddy definitions — seeded centrally, creator-authored via Studio.';
comment on column public.buddies.price_monthly is
  'Price in kobo (NGN smallest unit). 0 = free.';

-- ── user_buddies ──────────────────────────────────────────
-- Subscription junction: which users subscribe to which buddies.
create table public.user_buddies (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users (id) on delete cascade,
  buddy_id      text        not null references public.buddies (id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  active        boolean     not null default true,
  unique (user_id, buddy_id)
);

comment on table public.user_buddies is
  'User ↔ Buddy subscriptions.';

-- ── chat_sessions ─────────────────────────────────────────
-- One row per conversation — supports 1-to-1 and group chats.
create table public.chat_sessions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users (id) on delete cascade,
  buddy_ids       text[]      not null default '{}',  -- supports group chat
  session_name    text,
  is_group        boolean     not null default false,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

comment on table public.chat_sessions is
  'Chat sessions — 1-to-1 or multi-buddy group chats.';
comment on column public.chat_sessions.buddy_ids is
  'Array of buddy IDs. Length > 1 implies group chat.';

-- ── messages ──────────────────────────────────────────────
create table public.messages (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.chat_sessions (id) on delete cascade,
  role        text        not null check (role in ('user', 'assistant', 'signal')),
  buddy_id    text        references public.buddies (id) on delete set null,
  content     text        not null,
  metadata    jsonb       not null default '{}',
  -- metadata shape: { goalCard?, agentCard?, followUpCard?, signalAlert? }
  created_at  timestamptz not null default now()
);

comment on table public.messages is
  'Individual messages within a chat session.';
comment on column public.messages.buddy_id is
  'Populated for assistant messages — identifies which buddy responded (group chats).';
comment on column public.messages.metadata is
  'Structured overlays: goalCard, agentCard, followUpCard, signalAlert.';

-- Index for fast session history retrieval
create index messages_session_created_idx
  on public.messages (session_id, created_at);

-- ── goals ─────────────────────────────────────────────────
create table public.goals (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users (id) on delete cascade,
  buddy_id       text        references public.buddies (id) on delete set null,
  title          text        not null,
  target_amount  bigint      not null,   -- kobo
  current_amount bigint      not null default 0,  -- kobo
  target_date    date,
  status         text        not null default 'active'
                             check (status in ('active', 'completed', 'paused', 'cancelled')),
  created_at     timestamptz not null default now()
);

comment on table public.goals is
  'Financial goals tracked per user, optionally created via a buddy chat.';
comment on column public.goals.target_amount is
  'Target amount in kobo.';
comment on column public.goals.current_amount is
  'Current saved amount in kobo.';

-- ── databank_entries ──────────────────────────────────────
create table public.databank_entries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users (id) on delete cascade,
  source      text        not null
              check (source in ('upload', 'gmail', 'manual', 'openbanking')),
  entry_type  text        not null
              check (entry_type in ('income', 'expense', 'subscription', 'asset', 'debt')),
  amount      bigint      not null,   -- kobo; negative = debit
  description text,
  category    text,
  entry_date  date        not null,
  metadata    jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

comment on table public.databank_entries is
  'Financial transactions and data points ingested from all sources.';
comment on column public.databank_entries.amount is
  'Amount in kobo. Use negative values for debits/expenses.';
comment on column public.databank_entries.metadata is
  'Source-specific data: parsed PDF fields, Gmail message ID, Open Banking transaction ID, etc.';

-- Index for date-range queries (analytics)
create index databank_entries_user_date_idx
  on public.databank_entries (user_id, entry_date desc);

-- ── agent_actions ─────────────────────────────────────────
create table public.agent_actions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (id) on delete cascade,
  buddy_id     text        references public.buddies (id) on delete set null,
  action_type  text        not null,
  description  text        not null,
  amount       bigint,     -- kobo
  currency     text        not null default 'NGN',
  from_account text,
  to_account   text,
  status       text        not null default 'pending'
               check (status in ('pending', 'approved', 'executed', 'declined')),
  reference    text        unique,
  approved_at  timestamptz,
  executed_at  timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.agent_actions is
  'Buddy-proposed financial actions awaiting or having received user approval.';
comment on column public.agent_actions.reference is
  'Unique payment/action reference for idempotency (e.g. Paystack reference).';

-- ── signal_sources ────────────────────────────────────────
create table public.signal_sources (
  id             text        primary key,
  name           text        not null,
  description    text,
  creator_name   text,
  price_monthly  integer     not null default 0,  -- kobo
  api_endpoint   text,
  signal_schema  jsonb       not null default '{}',
  status         text        not null default 'active'
                             check (status in ('active', 'inactive', 'pending')),
  created_at     timestamptz not null default now()
);

comment on table public.signal_sources is
  'External data providers available in DataBank → Signal Sources.';

-- ── user_signal_sources ───────────────────────────────────
create table public.user_signal_sources (
  user_id       uuid        not null references public.users (id) on delete cascade,
  source_id     text        not null references public.signal_sources (id) on delete cascade,
  enabled       boolean     not null default true,
  subscribed_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

comment on table public.user_signal_sources is
  'User subscriptions to individual signal sources.';


-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

alter table public.users              enable row level security;
alter table public.buddies            enable row level security;
alter table public.user_buddies       enable row level security;
alter table public.chat_sessions      enable row level security;
alter table public.messages           enable row level security;
alter table public.goals              enable row level security;
alter table public.databank_entries   enable row level security;
alter table public.agent_actions      enable row level security;
alter table public.signal_sources     enable row level security;
alter table public.user_signal_sources enable row level security;


-- ── users ─────────────────────────────────────────────────
create policy "users: own row only"
  on public.users
  for all
  using (id = auth.uid());

-- ── buddies ───────────────────────────────────────────────
-- Publicly readable; only the creator (or service role) can write.
create policy "buddies: public read"
  on public.buddies
  for select
  using (true);

create policy "buddies: creator write"
  on public.buddies
  for insert
  with check (creator_id = auth.uid());

create policy "buddies: creator update"
  on public.buddies
  for update
  using (creator_id = auth.uid());

-- ── user_buddies ──────────────────────────────────────────
create policy "user_buddies: own rows only"
  on public.user_buddies
  for all
  using (user_id = auth.uid());

-- ── chat_sessions ─────────────────────────────────────────
create policy "chat_sessions: own rows only"
  on public.chat_sessions
  for all
  using (user_id = auth.uid());

-- ── messages ──────────────────────────────────────────────
-- Users can only access messages belonging to their own sessions.
create policy "messages: own sessions only"
  on public.messages
  for all
  using (
    session_id in (
      select id from public.chat_sessions where user_id = auth.uid()
    )
  );

-- ── goals ─────────────────────────────────────────────────
create policy "goals: own rows only"
  on public.goals
  for all
  using (user_id = auth.uid());

-- ── databank_entries ──────────────────────────────────────
create policy "databank_entries: own rows only"
  on public.databank_entries
  for all
  using (user_id = auth.uid());

-- ── agent_actions ─────────────────────────────────────────
create policy "agent_actions: own rows only"
  on public.agent_actions
  for all
  using (user_id = auth.uid());

-- ── signal_sources ────────────────────────────────────────
create policy "signal_sources: public read"
  on public.signal_sources
  for select
  using (true);

-- ── user_signal_sources ───────────────────────────────────
create policy "user_signal_sources: own rows only"
  on public.user_signal_sources
  for all
  using (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════
-- AUTO-PROVISION USER PROFILE ON SIGN-UP
-- ════════════════════════════════════════════════════════════
-- Creates a row in public.users whenever a new auth.users row
-- is inserted (e.g. email sign-up, OAuth callback).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
