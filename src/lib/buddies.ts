export type BuddyModel = "Claude" | "GPT-4" | "Gemini";
export type BuddyCategory =
  | "Investing"
  | "Budgeting"
  | "Entrepreneurship"
  | "Academic"
  | "Crypto"
  | "Celebrity Sim"
  | "Real Estate";

export type Review = {
  name: string;
  stars: string;
  text: string;
};

export type Buddy = {
  id: string;
  name: string;
  tag: string;
  desc: string;
  price: string;        // "Free" | "₦X,000/mo"
  priceNote: string;
  badge: string;        // display label for badge
  badgeType: "free" | "pro";
  bannerColor: string;  // CSS gradient or color string
  avatarBg: string;
  avatarContent: string; // emoji or initials
  avatarIsSerif: boolean;
  model: BuddyModel;
  modelColor: string;
  rating: string;
  reviewCount: string;
  isFanSim: boolean;
  disclaimer?: string;
  categories: BuddyCategory[];
  philosophy: string;
  samples: string[];
  reviews: Review[];
  includes: string[];
};

export const ALL_BUDDIES: Buddy[] = [
  // ─── Archetypes ──────────────────────────────────────────────────────────
  {
    id: "contrarian",
    name: "The Contrarian Investor",
    tag: "Value Investing · Long-Term Wealth",
    desc: "Challenges conventional wisdom. Focuses on fundamentals, patience, and avoiding the crowd.",
    price: "Free",
    priceNote: "Unlimited chats · Full DataBank access · Smart notifications",
    badge: "Free",
    badgeType: "free",
    bannerColor: "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    avatarBg: "#1A3A6E",
    avatarContent: "🎯",
    avatarIsSerif: false,
    model: "Claude",
    modelColor: "#7B68EE",
    rating: "4.9",
    reviewCount: "2.1k",
    isFanSim: false,
    categories: ["Investing"],
    philosophy:
      "Believes the crowd is almost always wrong at the extremes. Builds wealth by buying what others are selling, holding what others are abandoning, and ignoring what everyone is excited about. Patience is the edge.",
    samples: [
      "You have ₦200k in savings earning 4% — inflation is at 18%. That's negative real returns. We need to talk about what's stopping you from moving this money.",
      "Your food delivery spend is ₦22k this month. That's not an expense — it's a choice. What would happen if you cooked 5 days a week for 60 days?",
    ],
    reviews: [
      { name: "Adaeze M.", stars: "★★★★★", text: "It spotted I was spending ₦45k/month on things I'd forgotten about. First month paid for itself 30 times over." },
      { name: "Chukwuma B.", stars: "★★★★★", text: "The salary notification feature is insane. Within minutes of my bank alert, it had a full allocation plan ready." },
      { name: "Ngozi F.", stars: "★★★★☆", text: "Blunt but in the right way. Told me to cut subscriptions and I finally did it. ₦18k/month saved." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Gmail DataBank integration",
      "Bank statement context",
      "Live news feed (optional)",
      "Smart proactive notifications",
      "Goal tracking & check-ins",
    ],
  },
  {
    id: "closer",
    name: "The Aggressive Closer",
    tag: "High Growth · Entrepreneurship",
    desc: "No excuses. Maximum growth. Pushes you to think bigger and eliminate financial mediocrity.",
    price: "$5/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$5/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#1A5E1A,#2D8A2D)",
    avatarBg: "#2D8A2D",
    avatarContent: "🦁",
    avatarIsSerif: false,
    model: "GPT-4",
    modelColor: "#10A37F",
    rating: "4.7",
    reviewCount: "5.4k",
    isFanSim: false,
    categories: ["Entrepreneurship", "Investing"],
    philosophy:
      "Zero tolerance for idle money, excuses, or financial mediocrity. Every naira should be working harder than you are. Pushes you to earn more, invest faster, and stop confusing comfort with security.",
    samples: [
      "You're not broke — you're under-earning. The spending problem will solve itself when your income is 3x bigger. What's the bottleneck?",
      "You've been \u201Cthinking about investing\u201D for 6 months. The market doesn't care. Make a decision today — any decision — and adjust as you learn.",
    ],
    reviews: [
      { name: "Emeka O.", stars: "★★★★★", text: "This is the kick I needed. Uncomfortable conversations that led to real action. Income up 40% in 4 months." },
      { name: "Tolu A.", stars: "★★★★☆", text: "Not for everyone — it's very blunt. But if you need a push, this buddy delivers." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank + Gmail integration",
      "Aggressive notification mode",
      "Goal accountability check-ins",
      "Weekly performance challenge",
    ],
  },
  {
    id: "academic",
    name: "The Academic Economist",
    tag: "Macroeconomics · Research-Driven",
    desc: "Evidence-based guidance from academic research, macroeconomic theory, and behavioural economics.",
    price: "$4/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$4/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#6B1A6B,#A040A0)",
    avatarBg: "#A040A0",
    avatarContent: "🏛️",
    avatarIsSerif: false,
    model: "Gemini",
    modelColor: "#4285F4",
    rating: "4.8",
    reviewCount: "1.8k",
    isFanSim: false,
    categories: ["Academic", "Investing"],
    philosophy:
      "Evidence-based financial guidance rooted in decades of academic research. Applies behavioural economics, macroeconomic theory, and empirical data to help you make decisions that are rational — not reactive.",
    samples: [
      "The data on market timing is clear: investors who stay the course outperform those who move in and out by an average of 1.5-2% annually. Let's build a strategy you can actually stick to.",
      "Your loss aversion is causing you to leave money in a low-yield account. The psychological discomfort of volatility is costing you roughly ₦180k in foregone returns this year.",
    ],
    reviews: [
      { name: "Dr. Amara K.", stars: "★★★★★", text: "Finally a finance tool that respects intelligence. The references to actual research are a huge differentiator." },
      { name: "Bayo M.", stars: "★★★★★", text: "Helped me understand why I kept making the same emotional decisions with money. Game-changer." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Research-backed advice with citations",
      "Behavioural bias tracking",
      "Live market data via Gemini",
    ],
  },
  {
    id: "lagos",
    name: "The Lagos Street Smart",
    tag: "Nigerian Markets · Practical Finance",
    desc: "Deeply rooted in the Nigerian financial reality. Advice built for where you actually are.",
    price: "$6/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$6/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#1A4A6B,#2E7DAA)",
    avatarBg: "#2E7DAA",
    avatarContent: "📊",
    avatarIsSerif: false,
    model: "GPT-4",
    modelColor: "#10A37F",
    rating: "4.9",
    reviewCount: "8.7k",
    isFanSim: false,
    categories: ["Investing", "Budgeting"],
    philosophy:
      "Built for the Nigerian financial reality. Understands FX volatility, CBN policy swings, dollar-denominated assets, the informal economy, and how to build real wealth in an environment most financial tools aren't designed for.",
    samples: [
      "The naira dropped 8% this week. Based on your income profile, here's exactly what this means for your purchasing power and what you can do about it today.",
      "Your bank savings rate is 5.5%. Inflation is 28%. You're losing money by saving the traditional way. Let's talk T-bills, dollar MMFs, and Eurobonds.",
    ],
    reviews: [
      { name: "Funmi A.", stars: "★★★★★", text: "Finally — a buddy that actually understands Lagos! Knows what Nairametrics is, understands CBN policy, speaks my financial language." },
      { name: "Kola B.", stars: "★★★★★", text: "Moved ₦500k into T-bills based on this buddy's advice. Made more in 3 months than I did all of last year in my savings account." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank + Gmail integration",
      "CBN & FX live monitoring",
      "Nigerian market news feed",
      "Goal tracking & investment planning",
    ],
  },
  {
    id: "architect",
    name: "The Asset Architect",
    tag: "Real Estate · Passive Income",
    desc: "Build wealth through assets, not income. Cash flow thinking and real estate fundamentals.",
    price: "Free",
    priceNote: "Unlimited chats · Full DataBank access",
    badge: "Free",
    badgeType: "free",
    bannerColor: "linear-gradient(135deg,#8B4513,#CD853F)",
    avatarBg: "#CD853F",
    avatarContent: "🏠",
    avatarIsSerif: false,
    model: "Claude",
    modelColor: "#7B68EE",
    rating: "4.6",
    reviewCount: "3.2k",
    isFanSim: false,
    categories: ["Real Estate", "Investing"],
    philosophy:
      "Wealth is built through assets, not income. Focuses on acquiring cash-flowing assets, building passive income streams, and shifting your mindset from earning to owning. Every financial decision is evaluated: does this buy me more freedom?",
    samples: [
      "You have ₦800k sitting in savings. That's not savings — that's a down payment looking for an asset. What kind of asset would give you passive income right now?",
      "The question isn't whether to invest in real estate. The question is: which type of real estate at your current capital level gives you the best cash-on-cash return?",
    ],
    reviews: [
      { name: "Shade O.", stars: "★★★★★", text: "Completely changed how I think about money. Went from saver to asset builder in 6 months." },
      { name: "Rotimi A.", stars: "★★★★☆", text: "Solid advice on real estate in Nigeria specifically. Very practical, not just theory." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Gmail DataBank integration",
      "Bank statement context",
      "Real estate opportunity analysis",
      "Passive income goal tracking",
    ],
  },

  // ─── Celebrity Sims ───────────────────────────────────────────────────────
  {
    id: "buffett",
    name: "Warren Buffett",
    tag: "Value Investing · Long-Term Compounding",
    desc: "AI simulation of Buffett's philosophy: buy wonderful companies at fair prices, think in decades, and let compound interest do the heavy lifting.",
    price: "$7/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$7/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#1B3A1B,#2D5A2D)",
    avatarBg: "#2D5A2D",
    avatarContent: "WB",
    avatarIsSerif: true,
    model: "Claude",
    modelColor: "#7B68EE",
    rating: "4.9",
    reviewCount: "6.2k",
    isFanSim: true,
    disclaimer: "Fan-created simulation based on publicly available books, interviews, and shareholder letters. Not affiliated with or endorsed by Warren Buffett or Berkshire Hathaway.",
    categories: ["Investing", "Celebrity Sim"],
    philosophy:
      "This simulation draws from Buffett's letters to shareholders, interviews, and books. His core belief: buy wonderful companies at fair prices, think in decades not quarters, and let compound interest do the heavy lifting.",
    samples: [
      "Your ₦450k salary is irrelevant if you spend ₦449k. The wealth-building mechanism is the gap between what you earn and what you spend — and then investing that gap wisely.",
      "You're asking about timing the market. I've been trying to do that for 60 years and still can't. What I can do is find businesses with durable competitive advantages and hold them through the noise.",
    ],
    reviews: [
      { name: "Femi B.", stars: "★★★★★", text: "The patience this buddy teaches is invaluable. It stopped me from panic-selling three times this year." },
      { name: "Ifeoma C.", stars: "★★★★★", text: "Closest thing to reading Buffett's shareholder letters but applied to my own portfolio." },
      { name: "Uche D.", stars: "★★★★☆", text: "Very conservative approach — which is exactly what I needed. Changed my whole investment horizon." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Long-term portfolio analysis",
      "Compounding goal projections",
      "Patience-first notification mode",
    ],
  },
  {
    id: "kiyosaki",
    name: "Robert Kiyosaki",
    tag: "Assets vs Liabilities · Financial IQ",
    desc: "AI simulation of Kiyosaki's Rich Dad philosophy: make your money work for you, acquire assets, avoid liabilities disguised as assets, and invest in financial education.",
    price: "$5/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$5/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#3A0A0A,#701010)",
    avatarBg: "#701010",
    avatarContent: "RK",
    avatarIsSerif: true,
    model: "GPT-4",
    modelColor: "#10A37F",
    rating: "4.8",
    reviewCount: "11.4k",
    isFanSim: true,
    disclaimer: "Fan-created simulation based on publicly available books, courses, and interviews. Not affiliated with or endorsed by Robert Kiyosaki or the Rich Dad brand.",
    categories: ["Investing", "Celebrity Sim"],
    philosophy:
      "This simulation draws from Rich Dad Poor Dad, Cashflow Quadrant, and Kiyosaki's interviews. His core belief: the rich don't work for money — they make money work for them. Your house is not an asset.",
    samples: [
      "Your bank savings account is a liability disguised as security. It's paying you 5% while inflation runs at 28%. A liability by any other name. Let's find you an actual asset.",
      "You're asking which stocks to buy. I'd rather you ask: what business skill can I develop this month that will let me afford those stocks without selling when the market dips?",
    ],
    reviews: [
      { name: "Chinwe O.", stars: "★★★★★", text: "I read Rich Dad Poor Dad but this buddy made me actually apply it to my real finances." },
      { name: "Seun A.", stars: "★★★★★", text: "It identified three liabilities I was calling assets. Saving me ₦62k a month now." },
      { name: "Emeka K.", stars: "★★★★☆", text: "Very Rich Dad in tone and substance. Exactly what I wanted." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Asset vs. liability classification",
      "Cashflow quadrant analysis",
      "Financial IQ goal tracking",
    ],
  },
  {
    id: "cardone",
    name: "Grant Cardone",
    tag: "10X Growth · Sales · Real Estate",
    desc: "AI simulation of Cardone's 10X philosophy: obsessive action, massive income targets, and using debt strategically to acquire cash-flowing real estate.",
    price: "$6/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$6/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#1A0A2E,#3A1060)",
    avatarBg: "#3A1060",
    avatarContent: "GC",
    avatarIsSerif: true,
    model: "GPT-4",
    modelColor: "#10A37F",
    rating: "4.7",
    reviewCount: "9.1k",
    isFanSim: true,
    disclaimer: "Fan-created simulation based on publicly available books, courses, and interviews. Not affiliated with or endorsed by Grant Cardone or Cardone Capital.",
    categories: ["Entrepreneurship", "Celebrity Sim"],
    philosophy:
      "This simulation draws from the 10X Rule, Be Obsessed or Be Average, and Cardone's interviews. His core belief: you are not thinking big enough. Income problems are income problems, not expense problems.",
    samples: [
      "You're trying to cut ₦5k in expenses. I want you to think about how to make ₦500k more instead. Expenses are a spending problem. Income is a math problem — and math is solvable.",
      "Average is a failing plan. Your emergency fund is not a financial goal — it's a survival strategy. The real goal is to never need one because your income is 10x your expenses.",
    ],
    reviews: [
      { name: "Tunde A.", stars: "★★★★★", text: "This buddy will make you uncomfortable — and that's the point. My income doubled in 8 months." },
      { name: "Blessing N.", stars: "★★★★☆", text: "Very aggressive style. Not for everyone, but it lit a fire under me that I needed." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Income growth goal tracking",
      "10X challenge mode",
      "Aggressive weekly notifications",
    ],
  },
  {
    id: "ramsey",
    name: "Dave Ramsey",
    tag: "Debt Freedom · Baby Steps · Discipline",
    desc: "AI simulation of Ramsey's Total Money Makeover approach: eliminate debt with intensity, live on less than you earn, build a baby emergency fund, then wealth-build debt-free.",
    price: "$4/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$4/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#00213A,#004070)",
    avatarBg: "#004070",
    avatarContent: "DR",
    avatarIsSerif: true,
    model: "Claude",
    modelColor: "#7B68EE",
    rating: "4.8",
    reviewCount: "5.3k",
    isFanSim: true,
    disclaimer: "Fan-created simulation based on publicly available books, radio shows, and interviews. Not affiliated with or endorsed by Dave Ramsey or Ramsey Solutions.",
    categories: ["Budgeting", "Celebrity Sim"],
    philosophy:
      "This simulation draws from The Total Money Makeover and Ramsey's radio show. His core belief: debt is the enemy of wealth. Get intense, get weird, live like no one else — so later you can live like no one else.",
    samples: [
      "You have ₦95k in credit card debt at 24%. That is a financial emergency. Not next month — this week. Cut every non-essential until that debt is gone.",
      "Your friends think you're crazy for not buying a new car on credit. Good. Normal in Nigeria is broke. Be weird, be intense, be debt-free.",
    ],
    reviews: [
      { name: "Ada S.", stars: "★★★★★", text: "I paid off ₦340k in debt in 8 months following this buddy's Baby Steps. I cried the day I made the last payment." },
      { name: "Gbenga O.", stars: "★★★★★", text: "The intensity and consistency of this approach is transformative." },
      { name: "Titi F.", stars: "★★★★☆", text: "Very conservative on investing — wait until debt is gone first. I agreed, and it worked." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Baby Steps progress tracker",
      "Debt snowball calculator",
      "Gazelle intensity notifications",
    ],
  },
  {
    id: "lynch",
    name: "Peter Lynch",
    tag: "Stock Picking · One Up on Wall Street",
    desc: "AI simulation of Lynch\u2019s \u201Cinvest in what you know\u201D philosophy: find great companies before Wall Street does, look for ten-baggers in everyday life, and ignore market noise.",
    price: "$5/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$5/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#0A1A2E,#1A3A5E)",
    avatarBg: "#1A3A5E",
    avatarContent: "PL",
    avatarIsSerif: true,
    model: "Claude",
    modelColor: "#7B68EE",
    rating: "4.7",
    reviewCount: "3.8k",
    isFanSim: true,
    disclaimer: "Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by Peter Lynch or Fidelity Investments.",
    categories: ["Investing", "Celebrity Sim"],
    philosophy:
      "This simulation draws from One Up on Wall Street, Beating the Street, and Lynch's interviews. His core belief: individual investors have an enormous edge over Wall Street — if they use it. Look for ten-baggers in everyday life.",
    samples: [
      "You shop at the same supermarket every week. Is it always busy? Is it expanding? That's more insight than any analyst report. Start there.",
      "What do you actually understand about this investment? If you can't explain in two sentences why this company will be worth more in 3 years, don't buy it.",
    ],
    reviews: [
      { name: "Lekan B.", stars: "★★★★★", text: "This completely changed how I look at investing. I found two incredible opportunities just paying attention to businesses I use every day." },
      { name: "Yewande K.", stars: "★★★★☆", text: "Approachable, practical stock analysis. Very different from the fear-driven advice you usually get." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Ten-bagger opportunity radar",
      "Know-what-you-own analysis",
      "Patient growth goal tracking",
    ],
  },
  {
    id: "trump",
    name: "Donald Trump",
    tag: "Deal-Making · Branding · Real Estate",
    desc: "AI simulation of Trump's deal-making philosophy from The Art of the Deal: think big, negotiate hard, leverage your brand, and treat every financial move as a negotiation to win.",
    price: "$6/mo",
    priceNote: "3-day free trial · Cancel anytime",
    badge: "$6/mo",
    badgeType: "pro",
    bannerColor: "linear-gradient(135deg,#2A1A00,#5A3800)",
    avatarBg: "#5A3800",
    avatarContent: "DT",
    avatarIsSerif: true,
    model: "GPT-4",
    modelColor: "#10A37F",
    rating: "4.5",
    reviewCount: "7.8k",
    isFanSim: true,
    disclaimer: "Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by Donald Trump or The Trump Organization.",
    categories: ["Entrepreneurship", "Real Estate", "Celebrity Sim"],
    philosophy:
      "This simulation draws from The Art of the Deal and public interviews. His deal-making framework: think bigger than everyone else in the room, negotiate from strength, use other people's money strategically, and treat your name as your most valuable asset.",
    samples: [
      "This is a terrible deal and you know it. You're paying full price on a depreciating asset with no leverage. Never pay asking price — always find their pain point first.",
      "You want to start a business? What's your brand? People don't buy products — they buy reputation. Build yours before you build anything else.",
    ],
    reviews: [
      { name: "Dayo M.", stars: "★★★★☆", text: "The negotiation frameworks alone were worth the subscription. Saved ₦180k on a property deal." },
      { name: "Kemi A.", stars: "★★★★☆", text: "Very bold, sometimes too bold — but the deal-making mindset is genuinely useful." },
    ],
    includes: [
      "Unlimited chat sessions",
      "Full DataBank integration",
      "Deal analysis framework",
      "Negotiation coaching mode",
      "Brand-building financial strategy",
    ],
  },
];

export function getBuddy(id: string): Buddy | undefined {
  return ALL_BUDDIES.find((b) => b.id === id);
}

export const ARCHETYPE_BUDDIES = ALL_BUDDIES.filter((b) => !b.isFanSim);
export const CELEBRITY_BUDDIES = ALL_BUDDIES.filter((b) => b.isFanSim);
