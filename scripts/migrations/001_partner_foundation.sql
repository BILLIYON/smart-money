-- ==============================================================================
-- Migration: 001_partner_foundation.sql
-- Description: Partner Organizations, Staff, Clients, and Consent Scopes
-- Task: Phase 1, Task 1.1 (T1.1)
-- ==============================================================================

-- 1. Partner Organizations
CREATE TABLE IF NOT EXISTS public.partner_orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Wealth Management',
    icon TEXT,
    banner_style TEXT,
    description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    min_portfolio BIGINT DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    approval_threshold_kobo BIGINT NOT NULL DEFAULT 50000000, -- 500,000 NGN default threshold
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Partner Staff
CREATE TABLE IF NOT EXISTS public.partner_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_org_id UUID NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'advisor', 'analyst', 'view_only')),
    invite_status TEXT NOT NULL DEFAULT 'invited' CHECK (invite_status IN ('active', 'invited', 'revoked')),
    invite_token TEXT UNIQUE,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_staff_org ON public.partner_staff(partner_org_id);
CREATE INDEX IF NOT EXISTS idx_partner_staff_email ON public.partner_staff(email);

-- 3. Partner Clients
CREATE TABLE IF NOT EXISTS public.partner_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_org_id UUID NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_staff_id UUID REFERENCES public.partner_staff(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_attention', 'paused', 'offboarded')),
    advisor_notes TEXT, -- Strictly private to partner staff, never exposed to client
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_partner_client UNIQUE (partner_org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_clients_org ON public.partner_clients(partner_org_id);
CREATE INDEX IF NOT EXISTS idx_partner_clients_user ON public.partner_clients(user_id);

-- 4. Partner Client Consent Scopes (THE Enforcement Point)
CREATE TABLE IF NOT EXISTS public.partner_client_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_org_id UUID NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('transactions', 'networth', 'goals', 'chat', 'actions')),
    enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_partner_client_scope UNIQUE (partner_org_id, user_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_partner_client_scopes ON public.partner_client_scopes(partner_org_id, user_id);

-- 5. Extend Users table for Partner Staff roles
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_partner_staff BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_org_id UUID REFERENCES public.partner_orgs(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_role TEXT;

-- 6. Seed Baseline Firm (Stanbic Wealth)
INSERT INTO public.partner_orgs (
    id, slug, name, type, icon, banner_style, description, tags, min_portfolio, is_public, approval_threshold_kobo
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'stanbic-wealth',
    'Stanbic Wealth',
    'Wealth Management',
    '🏛️',
    'linear-gradient(135deg,#0B1E3D,#1A3A6E)',
    'Institutional wealth advisory, portfolio management, and estate planning tailored for high-net-worth Nigerian professionals and diaspora investors.',
    ARRAY['HNW', 'Fixed Income', 'Equities', 'Estate Planning'],
    5000000,
    true,
    50000000
) ON CONFLICT (slug) DO NOTHING;
