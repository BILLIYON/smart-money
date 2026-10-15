-- ==============================================================================
-- Migration: 002_partner_applications.sql
-- Description: Partner Applications table and directory firms seed
-- Task: Phase 2, Tasks 2.1 & 2.2 (T2.1, T2.2)
-- ==============================================================================

-- 1. Partner Applications Table
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_org_id UUID NOT NULL REFERENCES public.partner_orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    income_range TEXT NOT NULL,
    goals_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'docs_missing', 'approved', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_org ON public.partner_applications(partner_org_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_user ON public.partner_applications(user_id);

-- 2. Add extra rich metadata columns to partner_orgs for directory display
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS icon_bg TEXT;
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS rating TEXT DEFAULT '4.8★';
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS client_count_text TEXT DEFAULT '1,000+';
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS min_portfolio_text TEXT DEFAULT '₦0';
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS full_description TEXT;
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS includes TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.partner_orgs ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]'::JSONB;

-- 3. Seed Verified Partner Firms
INSERT INTO public.partner_orgs (
    id, slug, name, type, icon, icon_bg, banner_style, description, tags, 
    min_portfolio, is_public, approval_threshold_kobo, rating, client_count_text, 
    min_portfolio_text, full_description, includes, reviews
) VALUES 
(
    'a0000000-0000-0000-0000-000000000002',
    'meristem',
    'Meristem Securities',
    'Investment Advisory',
    '📈',
    '#1A3A6E',
    'linear-gradient(135deg,#1A3A6E,#0B2040)',
    'Full-service stockbroking and investment advisory. Nigeria''s leading independent research firm. Access to NGX, T-bills, Eurobonds and structured products.',
    ARRAY['NGX Trading', 'Portfolio Mgmt', 'Research', 'Free Intro'],
    50000000,
    true,
    50000000,
    '4.9★',
    '2,800+',
    '₦50M+',
    'Meristem Securities has operated in the Nigerian capital markets for over two decades, combining licensed brokerage execution with independent equity research. Clients get a named relationship manager, direct NGX trade execution, and access to fixed-income instruments (T-bills, Eurobonds, commercial paper) alongside their Smart Money AI buddy — the AI handles day-to-day questions, Meristem handles the trades and the paperwork.',
    ARRAY['Named relationship manager', 'NGX trade execution', 'T-bills, Eurobonds & structured products', 'Weekly equity research notes', 'Free 30-minute intro consultation'],
    '[
        {"name": "Femi O.", "stars": "★★★★★", "text": "Having my broker connected directly to my Smart Money plan cut down our quarterly review to 15 minutes. Best decision I made for my equity portfolio."},
        {"name": "Ngozi A.", "stars": "★★★★★", "text": "Research notes are top-tier. My buddy summarizes them and flags when a stock I watch gets upgraded."}
    ]'::JSONB
),
(
    'a0000000-0000-0000-0000-000000000003',
    'cowrywise',
    'Cowrywise Pro Advisory',
    'Wealth Management',
    '🌱',
    '#1A5E1A',
    'linear-gradient(135deg,#1A5E1A,#0A3A0A)',
    'Digital-first wealth management for the modern Nigerian. MMF, mutual funds, dollar investments, and now human advisor access for high-growth clients.',
    ARRAY['MMF', 'Mutual Funds', 'Dollar Savings', 'Free Intro'],
    0,
    true,
    20000000,
    '4.8★',
    '12,000+',
    '₦0',
    'Digital-first wealth management designed for Nigeria''s growing professional class. Combine automated index investing and dollar savings with a dedicated advisory tier that understands modern tech compensation, cross-border earnings, and long-term passive wealth creation.',
    ARRAY['Automated mutual fund allocation', 'Multi-currency dollar portfolios', 'Quarterly tax & rebalancing check-in', 'Direct integration with Smart Money Goals'],
    '[
        {"name": "Tolu K.", "stars": "★★★★★", "text": "Seamless transition from automated saving to active portfolio building. Zero friction."}
    ]'::JSONB
),
(
    'a0000000-0000-0000-0000-000000000004',
    'arm',
    'ARM Investment Managers',
    'Asset Management',
    '🏛️',
    '#6B1A1A',
    'linear-gradient(135deg,#6B1A1A,#3A0A0A)',
    'One of Nigeria''s most trusted asset managers. ARM Money Market Fund, pension management, real estate investment trusts, and bespoke private wealth.',
    ARRAY['MMF', 'Pension', 'REIT', 'Private Wealth'],
    100000000,
    true,
    100000000,
    '4.7★',
    '85,000+',
    '₦100M+',
    'With over 25 years of institutional asset management in Nigeria, ARM provides institutional rigor for high-net-worth individuals and corporate treasuries. Seamlessly sync pension accounts, real estate trusts, and fixed income strategies into your Smart Money dashboard.',
    ARRAY['Institutional treasury yields', 'Dedicated private banker', 'Real estate REIT syndication', 'Integrated pension portfolio tracking'],
    '[
        {"name": "Alhaji B.", "stars": "★★★★★", "text": "Security and institutional discipline. Exactly what is required for generational capital preservation."}
    ]'::JSONB
)
ON CONFLICT (slug) DO UPDATE SET
    icon_bg = EXCLUDED.icon_bg,
    rating = EXCLUDED.rating,
    client_count_text = EXCLUDED.client_count_text,
    min_portfolio_text = EXCLUDED.min_portfolio_text,
    full_description = EXCLUDED.full_description,
    includes = EXCLUDED.includes,
    reviews = EXCLUDED.reviews;
