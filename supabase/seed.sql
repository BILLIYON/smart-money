-- ════════════════════════════════════════════════════════════
-- Smart Money — Seed Data
-- Run via: supabase db reset  (applies migrations then this file)
-- ════════════════════════════════════════════════════════════

-- ── Finance Buddies ───────────────────────────────────────
-- Prices in kobo (NGN × 100). 0 = free.
-- ai_model values must match check constraint: claude | gpt4 | gemini

insert into public.buddies (
  id, name, tag, description, philosophy,
  price_monthly, ai_model,
  banner_color, avatar_bg, avatar_content,
  rating, review_count,
  is_fan_sim, fan_disclaimer,
  status, category
) values

-- ── 1. The Contrarian Investor ────────────────────────────
(
  'contrarian',
  'The Contrarian Investor',
  'Value Investing · Long-Term Wealth',
  'Builds wealth by buying what others are selling and holding what others are abandoning.',
  'Believes the crowd is almost always wrong at the extremes. Builds wealth by buying what others are selling, holding what others are abandoning, and ignoring what everyone is excited about. Patience is the edge.',
  0,
  'claude',
  'linear-gradient(135deg,#0B1E3D,#1A3A6E)',
  '#1A3A6E',
  '🎯',
  4.8, 3,
  false, null,
  'live',
  array['Value Investing', 'Long-Term Wealth']
),

-- ── 2. The Aggressive Closer ──────────────────────────────
(
  'closer',
  'The Aggressive Closer',
  'High Growth · Entrepreneurship',
  'Zero tolerance for idle money, excuses, or financial mediocrity.',
  'Zero tolerance for idle money, excuses, or financial mediocrity. Every naira should be working harder than you are. Pushes you to earn more, invest faster, and stop confusing comfort with security.',
  200000,
  'gpt4',
  'linear-gradient(135deg,#1A5E1A,#2D8A2D)',
  '#2D8A2D',
  '🦁',
  4.6, 2,
  false, null,
  'live',
  array['High Growth', 'Entrepreneurship']
),

-- ── 3. The Academic Economist ─────────────────────────────
(
  'academic',
  'The Academic Economist',
  'Macroeconomics · Research-Driven',
  'Evidence-based financial guidance rooted in decades of academic research.',
  'Evidence-based financial guidance rooted in decades of academic research. Applies behavioural economics, macroeconomic theory, and empirical data to help you make decisions that are rational — not reactive.',
  150000,
  'gemini',
  'linear-gradient(135deg,#6B1A6B,#A040A0)',
  '#A040A0',
  '🏛️',
  4.9, 2,
  false, null,
  'live',
  array['Macroeconomics', 'Research-Driven']
),

-- ── 4. The Lagos Street Smart ─────────────────────────────
(
  'lagos',
  'The Lagos Street Smart',
  'Nigerian Markets · Practical Finance',
  'Built for the Nigerian financial reality — FX volatility, CBN policy, and the informal economy.',
  'Built for the Nigerian financial reality. Understands FX volatility, CBN policy swings, dollar-denominated assets, the informal economy, and how to build real wealth in an environment most financial tools aren''t designed for.',
  250000,
  'gpt4',
  'linear-gradient(135deg,#1A4A6B,#2E7DAA)',
  '#2E7DAA',
  '📊',
  4.9, 2,
  false, null,
  'live',
  array['Nigerian Markets', 'Practical Finance']
),

-- ── 5. The Asset Architect ────────────────────────────────
(
  'architect',
  'The Asset Architect',
  'Real Estate · Passive Income',
  'Wealth is built through assets, not income. Focuses on cash-flowing assets and passive income.',
  'Wealth is built through assets, not income. Focuses on acquiring cash-flowing assets, building passive income streams, and shifting your mindset from earning to owning. Every financial decision is evaluated: does this buy me more freedom?',
  0,
  'claude',
  'linear-gradient(135deg,#8B4513,#CD853F)',
  '#CD853F',
  '🏠',
  4.7, 2,
  false, null,
  'live',
  array['Real Estate', 'Passive Income']
),

-- ── 6. Warren Buffett (Fan Simulation) ───────────────────
(
  'buffett',
  'Warren Buffett (Fan Simulation)',
  'Value Investing · Long-Term Compounding',
  'Simulation drawing from Buffett''s letters to shareholders, interviews, and books.',
  'This simulation draws from Buffett''s letters to shareholders, interviews, and books. His core belief: buy wonderful companies at fair prices, think in decades not quarters, and let compound interest do the heavy lifting.',
  300000,
  'claude',
  'linear-gradient(135deg,#1B3A1B,#2D5A2D)',
  '#2D5A2D',
  'WB',
  4.8, 3,
  true,
  'Fan-created simulation based on publicly available books, interviews, and shareholder letters. Not affiliated with or endorsed by Warren Buffett or Berkshire Hathaway.',
  'live',
  array['Value Investing', 'Long-Term Compounding']
),

-- ── 7. Grant Cardone (Fan Simulation) ────────────────────
(
  'cardone',
  'Grant Cardone (Fan Simulation)',
  '10X Growth · Sales & Income',
  'Simulation drawing from the 10X Rule and Cardone''s interviews on income and obsession.',
  'This simulation draws from the 10X Rule, Be Obsessed or Be Average, and Cardone''s interviews. His core belief: you are not thinking big enough. Income problems are income problems, not expense problems.',
  250000,
  'gpt4',
  'linear-gradient(135deg,#1A0A2E,#3A1060)',
  '#3A1060',
  'GC',
  4.6, 2,
  true,
  'Fan-created simulation based on publicly available books, courses, and interviews. Not affiliated with or endorsed by Grant Cardone or Cardone Capital.',
  'live',
  array['10X Growth', 'Sales & Income']
),

-- ── 8. Robert Kiyosaki (Fan Simulation) ──────────────────
(
  'kiyosaki',
  'Robert Kiyosaki (Fan Simulation)',
  'Assets vs Liabilities · Financial IQ',
  'Simulation drawing from Rich Dad Poor Dad and the Cashflow Quadrant.',
  'This simulation draws from Rich Dad Poor Dad, Cashflow Quadrant, and Kiyosaki''s interviews. His core belief: the rich don''t work for money — they make money work for them. Your house is not an asset.',
  200000,
  'gpt4',
  'linear-gradient(135deg,#3A0A0A,#701010)',
  '#701010',
  'RK',
  4.8, 3,
  true,
  'Fan-created simulation based on publicly available books, courses, and interviews. Not affiliated with or endorsed by Robert Kiyosaki or the Rich Dad brand.',
  'live',
  array['Assets vs Liabilities', 'Financial IQ']
),

-- ── 9. Donald Trump (Fan Simulation) ─────────────────────
(
  'trump',
  'Donald Trump (Fan Simulation)',
  'Deal-Making · Branding & Leverage',
  'Simulation drawing from The Art of the Deal and Trump''s deal-making framework.',
  'This simulation draws from The Art of the Deal and public interviews. His deal-making framework: think bigger than everyone else in the room, negotiate from strength, use other people''s money strategically, and treat your name as your most valuable asset.',
  250000,
  'gpt4',
  'linear-gradient(135deg,#2A1A00,#5A3800)',
  '#5A3800',
  'DT',
  4.3, 2,
  true,
  'Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by Donald Trump or The Trump Organization.',
  'live',
  array['Deal-Making', 'Branding & Leverage']
),

-- ── 10. Dave Ramsey (Fan Simulation) ─────────────────────
(
  'ramsey',
  'Dave Ramsey (Fan Simulation)',
  'Debt Freedom · Baby Steps',
  'Simulation drawing from The Total Money Makeover and Ramsey''s radio show.',
  'This simulation draws from The Total Money Makeover and Ramsey''s radio show. His core belief: debt is the enemy of wealth. Get intense, get weird, live like no one else — so later you can live like no one else.',
  150000,
  'claude',
  'linear-gradient(135deg,#00213A,#004070)',
  '#004070',
  'DR',
  4.8, 3,
  true,
  'Fan-created simulation based on publicly available books, radio shows, and interviews. Not affiliated with or endorsed by Dave Ramsey or Ramsey Solutions.',
  'live',
  array['Debt Freedom', 'Baby Steps']
),

-- ── 11. Peter Lynch (Fan Simulation) ─────────────────────
(
  'lynch',
  'Peter Lynch (Fan Simulation)',
  'Stock Picking · One Up on Wall Street',
  'Simulation drawing from One Up on Wall Street — invest in what you understand.',
  'This simulation draws from One Up on Wall Street, Beating the Street, and Lynch''s interviews. His core belief: individual investors have an enormous edge over Wall Street — if they use it. Look for ten-baggers in everyday life.',
  200000,
  'claude',
  'linear-gradient(135deg,#0A1A2E,#1A3A5E)',
  '#1A3A5E',
  'PL',
  4.7, 2,
  true,
  'Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by Peter Lynch or Fidelity Investments.',
  'live',
  array['Stock Picking', 'One Up on Wall Street']
)

on conflict (id) do update set
  name            = excluded.name,
  tag             = excluded.tag,
  description     = excluded.description,
  philosophy      = excluded.philosophy,
  price_monthly   = excluded.price_monthly,
  ai_model        = excluded.ai_model,
  banner_color    = excluded.banner_color,
  avatar_bg       = excluded.avatar_bg,
  avatar_content  = excluded.avatar_content,
  is_fan_sim      = excluded.is_fan_sim,
  fan_disclaimer  = excluded.fan_disclaimer,
  status          = excluded.status,
  category        = excluded.category;


-- ── Signal Sources ─────────────────────────────────────────

insert into public.signal_sources (
  id, name, description, creator_name,
  price_monthly, status
) values

(
  'lagos-re-radar',
  'Lagos Real Estate Radar',
  'Live property listings, price-per-sqm trends, and developer deal flow across Lagos neighbourhoods.',
  'Jide Taiwo & Co',
  80000,
  'active'
),

(
  'ngx-screener-pro',
  'NGX Stock Screener Pro',
  'Real-time NGX equity screener with P/E, dividend yield, 52-week range, and analyst consensus signals.',
  'Meristem Securities',
  120000,
  'active'
),

(
  'tbill-alerts',
  'T-Bill Rate Alerts',
  'Instant alerts when CBN publishes new 91-day, 182-day, and 364-day T-bill rates at NTB auctions.',
  'Stanbic IBTC',
  0,
  'active'
)

on conflict (id) do update set
  name          = excluded.name,
  description   = excluded.description,
  creator_name  = excluded.creator_name,
  price_monthly = excluded.price_monthly,
  status        = excluded.status;
