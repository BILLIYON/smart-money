const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local variables
try {
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      process.env[key] = val;
    }
  });
} catch (e) {
  console.warn("Could not read .env.local file. Proceeding with existing env variables.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const buddies = [
  {
    id: 'contrarian',
    name: 'The Contrarian Investor',
    tag: 'Value Investing · Long-Term Wealth',
    description: 'Builds wealth by buying what others are selling and holding what others are abandoning.',
    philosophy: 'Believes the crowd is almost always wrong at the extremes. Builds wealth by buying what others are selling, holding what others are abandoning, and ignoring what everyone is excited about. Patience is the edge.',
    price_monthly: 0,
    ai_model: 'claude',
    banner_color: 'linear-gradient(135deg,#0B1E3D,#1A3A6E)',
    avatar_bg: '#1A3A6E',
    avatar_content: '🎯',
    rating: 4.8,
    review_count: 3,
    is_fan_sim: false,
    fan_disclaimer: null,
    status: 'live',
    category: ['Value Investing', 'Long-Term Wealth']
  },
  {
    id: 'closer',
    name: 'The Aggressive Closer',
    tag: 'High Growth · Entrepreneurship',
    description: 'Zero tolerance for idle money, excuses, or financial mediocrity.',
    philosophy: 'Zero tolerance for idle money, excuses, or financial mediocrity. Every naira should be working harder than you are. Pushes you to earn more, invest faster, and stop confusing comfort with security.',
    price_monthly: 200000,
    ai_model: 'gpt4',
    banner_color: 'linear-gradient(135deg,#1A5E1A,#2D8A2D)',
    avatar_bg: '#2D8A2D',
    avatar_content: '🦁',
    rating: 4.6,
    review_count: 2,
    is_fan_sim: false,
    fan_disclaimer: null,
    status: 'live',
    category: ['High Growth', 'Entrepreneurship']
  },
  {
    id: 'academic',
    name: 'The Academic Economist',
    tag: 'Macroeconomics · Research-Driven',
    description: 'Evidence-based financial guidance rooted in decades of academic research.',
    philosophy: 'Evidence-based financial guidance rooted in decades of academic research. Applies behavioural economics, macroeconomic theory, and empirical data to help you make decisions that are rational — not reactive.',
    price_monthly: 150000,
    ai_model: 'gemini',
    banner_color: 'linear-gradient(135deg,#6B1A6B,#A040A0)',
    avatar_bg: '#A040A0',
    avatar_content: '🏛️',
    rating: 4.9,
    review_count: 2,
    is_fan_sim: false,
    fan_disclaimer: null,
    status: 'live',
    category: ['Macroeconomics', 'Research-Driven']
  },
  {
    id: 'lagos',
    name: 'The Lagos Street Smart',
    tag: 'Nigerian Markets · Practical Finance',
    description: 'Built for the Nigerian financial reality — FX volatility, CBN policy, and the informal economy.',
    philosophy: 'Built for the Nigerian financial reality. Understands FX volatility, CBN policy swings, dollar-denominated assets, the informal economy, and how to build real wealth in an environment most financial tools aren\'t designed for.',
    price_monthly: 250000,
    ai_model: 'gpt4',
    banner_color: 'linear-gradient(135deg,#1A4A6B,#2E7DAA)',
    avatar_bg: '#2E7DAA',
    avatar_content: '📊',
    rating: 4.9,
    review_count: 2,
    is_fan_sim: false,
    fan_disclaimer: null,
    status: 'live',
    category: ['Nigerian Markets', 'Practical Finance']
  },
  {
    id: 'architect',
    name: 'The Asset Architect',
    tag: 'Real Estate · Passive Income',
    description: 'Wealth is built through assets, not income. Focuses on cash-flowing assets and passive income.',
    philosophy: 'Wealth is built through assets, not income. Focuses on acquiring cash-flowing assets, building passive income streams, and shifting your mindset from earning to owning. Every financial decision is evaluated: does this buy me more freedom?',
    price_monthly: 0,
    ai_model: 'claude',
    banner_color: 'linear-gradient(135deg,#8B4513,#CD853F)',
    avatar_bg: '#CD853F',
    avatar_content: '🏠',
    rating: 4.7,
    review_count: 2,
    is_fan_sim: false,
    fan_disclaimer: null,
    status: 'live',
    category: ['Real Estate', 'Passive Income']
  },
  {
    id: 'buffett',
    name: 'Warren Buffett (Fan Simulation)',
    tag: 'Value Investing · Long-Term Compounding',
    description: 'Simulation drawing from Buffett\'s letters to shareholders, interviews, and books.',
    philosophy: 'This simulation draws from Buffett\'s letters to shareholders, interviews, and books. His core belief: buy wonderful companies at fair prices, think in decades not quarters, and let compound interest do the heavy lifting.',
    price_monthly: 300000,
    ai_model: 'claude',
    banner_color: 'linear-gradient(135deg,#1B3A1B,#2D5A2D)',
    avatar_bg: '#2D5A2D',
    avatar_content: 'WB',
    rating: 4.8,
    review_count: 3,
    is_fan_sim: true,
    fan_disclaimer: 'Fan-created simulation based on publicly available books, interviews, and shareholder letters. Not affiliated with or endorsed by Warren Buffett or Berkshire Hathaway.',
    status: 'live',
    category: ['Value Investing', 'Long-Term Compounding']
  },
  {
    id: 'cardone',
    name: 'Grant Cardone (Fan Simulation)',
    tag: '10X Growth · Sales & Income',
    description: 'Simulation drawing from the 10X Rule and Cardone\'s interviews on income and obsession.',
    philosophy: 'This simulation draws from the 10X Rule, Be Obsessed or Be Average, and Cardone\'s interviews. His core belief: you are not thinking big enough. Income problems are income problems, not expense problems.',
    price_monthly: 250000,
    ai_model: 'gpt4',
    banner_color: 'linear-gradient(135deg,#1A0A2E,#3A1060)',
    avatar_bg: '#3A1060',
    avatar_content: 'GC',
    rating: 4.6,
    review_count: 2,
    is_fan_sim: true,
    fan_disclaimer: 'Fan-created simulation based on publicly available books, courses, and interviews. Not affiliated with or endorsed by Grant Cardone or Cardone Capital.',
    status: 'live',
    category: ['10X Growth', 'Sales & Income']
  },
  {
    id: 'kiyosaki',
    name: 'Robert Kiyosaki (Fan Simulation)',
    tag: 'Assets vs Liabilities · Financial IQ',
    description: 'Simulation drawing from Rich Dad Poor Dad and the Cashflow Quadrant.',
    philosophy: 'This simulation draws from Rich Dad Poor Dad, Cashflow Quadrant, and Kiyosaki\'s interviews. His core belief: the rich don\'t work for money — they make money work for them. Your house is not an asset.',
    price_monthly: 200000,
    ai_model: 'gpt4',
    banner_color: 'linear-gradient(135deg,#3A0A0A,#701010)',
    avatar_bg: '#701010',
    avatar_content: 'RK',
    rating: 4.8,
    review_count: 3,
    is_fan_sim: true,
    fan_disclaimer: 'Fan-created simulation based on publicly available books, courses, and interviews. Not affiliated with or endorsed by Robert Kiyosaki or the Rich Dad brand.',
    status: 'live',
    category: ['Assets vs Liabilities', 'Financial IQ']
  },
  {
    id: 'trump',
    name: 'Donald Trump (Fan Simulation)',
    tag: 'Deal-Making · Branding & Leverage',
    description: 'Simulation drawing from The Art of the Deal and Trump\'s deal-making framework.',
    philosophy: 'This simulation draws from The Art of the Deal and public interviews. His deal-making framework: think bigger than everyone else in the room, negotiate from strength, use other people\'s money strategically, and treat your name as your most valuable asset.',
    price_monthly: 250000,
    ai_model: 'gpt4',
    banner_color: 'linear-gradient(135deg,#2A1A00,#5A3800)',
    avatar_bg: '#5A3800',
    avatar_content: 'DT',
    rating: 4.3,
    review_count: 2,
    is_fan_sim: true,
    fan_disclaimer: 'Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by Donald Trump or The Trump Organization.',
    status: 'live',
    category: ['Deal-Making', 'Branding & Leverage']
  },
  {
    id: 'ramsey',
    name: 'Dave Ramsey (Fan Simulation)',
    tag: 'Debt Freedom · Baby Steps',
    description: 'Simulation drawing from The Total Money Makeover and Ramsey\'s radio show.',
    philosophy: 'This simulation draws from The Total Money Makeover and Ramsey\'s radio show. His core belief: debt is the enemy of wealth. Get intense, get weird, live like no one else — so later you can live like no one else.',
    price_monthly: 150000,
    ai_model: 'claude',
    banner_color: 'linear-gradient(135deg,#00213A,#004070)',
    avatar_bg: '#004070',
    avatar_content: 'DR',
    rating: 4.8,
    review_count: 3,
    is_fan_sim: true,
    fan_disclaimer: 'Fan-created simulation based on publicly available books, radio shows, and interviews. Not affiliated with or endorsed by Dave Ramsey or Ramsey Solutions.',
    status: 'live',
    category: ['Debt Freedom', 'Baby Steps']
  },
  {
    id: 'lynch',
    name: 'Peter Lynch (Fan Simulation)',
    tag: 'Stock Picking · One Up on Wall Street',
    description: 'Simulation drawing from One Up on Wall Street — invest in what you understand.',
    philosophy: 'This simulation draws from One Up on Wall Street, Beating the Street, and Lynch\'s interviews. His core belief: individual investors have an enormous edge over Wall Street — if they use it. Look for ten-baggers in everyday life.',
    price_monthly: 200000,
    ai_model: 'claude',
    banner_color: 'linear-gradient(135deg,#0A1A2E,#1A3A5E)',
    avatar_bg: '#1A3A5E',
    avatar_content: 'PL',
    rating: 4.7,
    review_count: 2,
    is_fan_sim: true,
    fan_disclaimer: 'Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by Peter Lynch or Fidelity Investments.',
    status: 'live',
    category: ['Stock Picking', 'One Up on Wall Street']
  }
];

const signalSources = [
  {
    id: 'lagos-re-radar',
    name: 'Lagos Real Estate Radar',
    description: 'Live property listings, price-per-sqm trends, and developer deal flow across Lagos neighbourhoods.',
    creator_name: 'Jide Taiwo & Co',
    price_monthly: 80000,
    status: 'active'
  },
  {
    id: 'ngx-screener-pro',
    name: 'NGX Stock Screener Pro',
    description: 'Real-time NGX equity screener with P/E, dividend yield, 52-week range, and analyst consensus signals.',
    creator_name: 'Meristem Securities',
    price_monthly: 120000,
    status: 'active'
  },
  {
    id: 'tbill-alerts',
    name: 'T-Bill Rate Alerts',
    description: 'Instant alerts when CBN publishes new 91-day, 182-day, and 364-day T-bill rates at NTB auctions.',
    creator_name: 'Stanbic IBTC',
    price_monthly: 0,
    status: 'active'
  }
];

async function seed() {
  console.log("Seeding buddies...");
  for (const buddy of buddies) {
    const { error } = await supabase.from("buddies").upsert(buddy);
    if (error) {
      console.error(`Error seeding buddy ${buddy.id}:`, error);
    } else {
      console.log(`Successfully seeded buddy: ${buddy.id}`);
    }
  }

  console.log("Seeding signal sources...");
  for (const src of signalSources) {
    const { error } = await supabase.from("signal_sources").upsert(src);
    if (error) {
      console.error(`Error seeding signal source ${src.id}:`, error);
    } else {
      console.log(`Successfully seeded signal source: ${src.id}`);
    }
  }
  console.log("Seeding complete!");
}

seed().catch(console.error);
