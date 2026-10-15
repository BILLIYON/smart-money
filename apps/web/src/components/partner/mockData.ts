/**
 * Static/mock data for the Partner Portal + Find a Partner screens.
 * Frontend-only build — no backend exists yet for partner orgs, staff,
 * clients, consent grants, etc. All data here is illustrative, matching
 * reference/SmartMoney_v1_partner.html. A backend developer will wire
 * these screens to real data later.
 */

export const PARTNER_ORG = {
  name: "Stanbic Wealth",
  subtitle: "Partner Portal · Admin",
};

export const OVERVIEW_KPIS = [
  { label: "Total Clients", value: "48", delta: "↑ 6 this month", tone: "up" as const },
  { label: "Avg Health Score", value: "71", delta: "↑ 3pts vs last month", tone: "warn" as const },
  { label: "Total AUM Tracked", value: "₦2.4B", delta: "↑ ₦280M this month", tone: "up" as const },
  { label: "Pending Approvals", value: "3", delta: "2 above ₦500k limit", tone: "warn" as const },
];

export const CLIENTS_NEEDING_ATTENTION = [
  {
    initials: "AN",
    color: "#E24B4A",
    name: "Amaka Nwosu",
    meta: "Savings rate dropped from 54% → 21% · 3 new subscriptions detected",
    cta: "View →",
    bg: "rgba(226,75,74,.04)",
    border: "rgba(226,75,74,.15)",
  },
  {
    initials: "BJ",
    color: "var(--gold)",
    name: "Biodun James",
    meta: "Goal deadline in 14 days · 43% funded · No activity this month",
    cta: "View →",
    bg: "rgba(245,166,35,.04)",
    border: "rgba(245,166,35,.2)",
  },
  {
    initials: "KO",
    color: "#4A90D9",
    name: "Kunle Okafor",
    meta: "Net worth grew ₦4.2M this month · Ready for wealth management tier upgrade",
    cta: "Schedule Call →",
    bg: "rgba(74,144,217,.04)",
    border: "rgba(74,144,217,.2)",
  },
];

export const SCHEDULED_REPORTS = [
  {
    title: "Monthly Financial Summary",
    sub: "Sent every 1st · Health Score + Spending + Goals · Branded Stanbic Wealth",
    status: "Active · 48 recipients",
  },
  {
    title: "Quarterly Portfolio Review",
    sub: "Sent every quarter · Investment returns + rebalancing suggestions",
    status: "Active · 31 recipients",
  },
];

export type ClientRow = {
  initials: string;
  color: string;
  name: string;
  joined: string;
  healthScore: number;
  healthColor: string;
  netWorth: string;
  lastActivity: string;
  dataShared: "Full access" | "Spend only";
  buddy: string;
  status: "Active" | "Needs attention";
};

export const CLIENTS: ClientRow[] = [
  { initials: "TK", color: "#0B1E3D", name: "Tunde Kamara", joined: "Joined Feb 2026", healthScore: 78, healthColor: "var(--green)", netWorth: "₦1.07M", lastActivity: "2 hours ago", dataShared: "Full access", buddy: "The Contrarian", status: "Active" },
  { initials: "AN", color: "#E24B4A", name: "Amaka Nwosu", joined: "Joined Jan 2026", healthScore: 42, healthColor: "#E24B4A", netWorth: "₦380k", lastActivity: "Yesterday", dataShared: "Full access", buddy: "Dave Ramsey (Fan)", status: "Needs attention" },
  { initials: "BJ", color: "var(--gold)", name: "Biodun James", joined: "Joined Mar 2026", healthScore: 61, healthColor: "var(--gold)", netWorth: "₦2.1M", lastActivity: "3 days ago", dataShared: "Spend only", buddy: "Stanbic Advisor AI", status: "Active" },
  { initials: "KO", color: "#4A90D9", name: "Kunle Okafor", joined: "Joined Nov 2025", healthScore: 89, healthColor: "var(--green)", netWorth: "₦8.4M", lastActivity: "1 hour ago", dataShared: "Full access", buddy: "Warren Buffett (Fan)", status: "Active" },
];

export const APPROVALS = [
  {
    initials: "TK",
    color: "#0B1E3D",
    client: "Tunde Kamara",
    requestedBy: "The Contrarian Investor (AI Buddy)",
    action: "Transfer to ARM MMF",
    amount: "₦750,000",
    from: "GTBank Savings",
    reasoning:
      "“Tunde's salary credited ₦450k this month. He has ₦1.2M idle in savings earning 5.5% while ARM MMF yields 16.4%. Moving 3 months of expenses to MMF will earn an additional ₦38,700/year. He approved this strategy in our conversation on March 18.”",
  },
  {
    initials: "KO",
    color: "#4A90D9",
    client: "Kunle Okafor",
    requestedBy: "Warren Buffett (Fan Sim)",
    action: "Buy GTCO stock",
    amount: "₦620,000",
    from: "Meristem Securities",
    reasoning:
      "“GTCO is trading at P/E 3.2 — below intrinsic value by my calculation. Dividend yield of 8.4% exceeds T-bill rate. Kunle has discussed Nigerian bank exposure in three sessions. This is a 7.4% position allocation, within his stated equity tolerance.”",
  },
];

export const FEATURE_TOGGLES = [
  { icon: "⭐", name: "Celebrity Buddy Simulations", desc: "Warren Buffett, Kiyosaki, Cardone etc. visible in Marketplace", on: true },
  { icon: "⚡", name: "Agentic Actions", desc: "AI buddy executes financial transactions on client's behalf", on: true },
  { icon: "📊", name: "Spending Analytics", desc: "Full DataBank analytics dashboard with all 5 sub-tabs", on: true },
  { icon: "👥", name: "Group Chat", desc: "Clients can create multi-buddy council conversations", on: true },
  { icon: "🏦", name: "Open Banking", desc: "Direct live bank connections via CBN Open Banking API", on: true },
  { icon: "📡", name: "Custom Signal Sessions", desc: "Third-party signal providers (Real estate, stock alerts etc.)", on: false },
  { icon: "🤖", name: "AI Studio (Creator)", desc: "Clients can build and publish their own Finance Buddies", on: false },
  { icon: "🎯", name: "Goal Tracker", desc: "Financial goal creation, tracking, and milestone alerts", on: true },
  { icon: "🔔", name: "Salary Moment Overlay", desc: "Full-screen allocation plan on salary credit detection", on: true },
  { icon: "🎨", name: "White-Label Mode", desc: "Replace Smart Money branding with your firm's logo & colours", on: false },
  { icon: "📋", name: "Marketplace (Public)", desc: "Clients can browse and subscribe to public buddies beyond yours", on: true },
];

export const PARTNER_BUDDIES = [
  { icon: "🏛️", bg: "linear-gradient(135deg,#0B1E3D,#1A3A6E)", color: "#fff", name: "Stanbic Wealth Advisor", meta: "Firm's primary AI buddy", type: "Firm Buddy", model: "Claude", visibility: "Private — Clients only" as const, subscribers: 48, escalatesTo: "Senior Advisor", status: "Live" },
  { icon: "AA", bg: "var(--gold)", color: "#fff", name: "Adaeze Akunna (AI)", meta: "Senior Wealth Manager · Book a Session", type: "Staff Profile", model: "GPT-4", visibility: "Private — Clients only" as const, subscribers: 31, escalatesTo: "Adaeze Akunna (real)", status: "Live" },
  { icon: "🌱", bg: "linear-gradient(135deg,#2D5A2D,#4A904A)", color: "#fff", name: "The First-Time Investor", meta: "Public Marketplace Buddy", type: "Public Buddy", model: "Claude", visibility: "Public — Anyone" as const, subscribers: 214, escalatesTo: "Firm intake form", status: "Live" },
];

export const ESCALATION_RULES = [
  { trigger: "Topic contains", value: "estate planning", target: "Senior Advisor (human)", on: true },
  { trigger: "Action above", value: "₦2,000,000", target: "Partner approval queue", on: true },
  { trigger: "Sentiment", value: "detected distress", target: "Adaeze Akunna (AI + Book CTA)", on: true },
];

export const ROLE_DEFS = [
  { role: "Admin", desc: "Full access. All clients, all data, billing, staff management" },
  { role: "Advisor", desc: "Assigned clients only. Full data, can approve actions, write goals" },
  { role: "Analyst", desc: "All clients, read-only spend analytics. Cannot see transactions" },
  { role: "View Only", desc: "Dashboard and health scores only. No individual client data" },
];

export const STAFF = [
  { initials: "MO", color: "var(--navy)", name: "Muyiwa Oladele", email: "muyiwa@stanbicwealth.com", role: "Admin", assigned: "All 48", buddy: "—", lastActive: "Now", status: "Active" },
  { initials: "AA", color: "var(--gold)", name: "Adaeze Akunna", email: "adaeze@stanbicwealth.com", role: "Advisor", assigned: "31 assigned", buddy: "Adaeze Akunna (AI)", lastActive: "1hr ago", status: "Active" },
  { initials: "EA", color: "#4A90D9", name: "Emeka Anyanwu", email: "emeka@stanbicwealth.com", role: "Analyst", assigned: "All (read-only)", buddy: "—", lastActive: "Yesterday", status: "Active" },
  { initials: "?", color: "var(--muted)", name: "Pending Invite", email: "blessing@stanbicwealth.com", role: "Advisor", assigned: "—", buddy: "—", lastActive: "Sent 2hrs ago", status: "Invited" },
];

export const ONBOARDING_FIELDS = [
  { type: "Text", label: "Full Legal Name", req: "Required" },
  { type: "Email", label: "Email Address", req: "Required" },
  { type: "Select", label: "Annual Income Range", req: "Required" },
  { type: "Select", label: "Net Worth Range", req: "Required" },
  { type: "Select", label: "Risk Tolerance", req: "Required" },
  { type: "Textarea", label: "Primary Financial Goals", req: "Required" },
  { type: "Upload", label: "Government-issued ID", req: "KYC" },
];

export const ONBOARDING_DOCS = [
  { title: "Investment Policy Statement", sub: "Client must read and sign", required: true },
  { title: "Risk Disclosure Document", sub: "Must acknowledge before proceeding", required: true },
  { title: "Data Sharing Consent", sub: "Authorises partner to view DataBank", required: true },
  { title: "Advisory Fee Schedule", sub: "Fee structure and billing terms", required: false },
];

export const PENDING_APPLICATIONS = [
  { name: "Funke Adeyemi", status: "Pending review", meta: "Applied 1hr ago · Net worth: ₦5M+ · Income: ₦800k+/mo", docsComplete: true },
  { name: "Chidi Okonkwo", status: "Docs missing", meta: "Applied yesterday · Missing: Government ID", docsComplete: false },
];

export const CUSTOM_ANALYTICS_RULES = [
  { icon: "🏦", name: "Net Worth Calculation", formula: "liquid_assets + investments + pension_value - all_liabilities", on: true },
  { icon: "💰", name: "Savings Rate", formula: "(income - expenses - loan_repayments) / income", on: true },
  { icon: "📈", name: "Investment Return", formula: "Annualised XIRR across all investment entries", on: true },
  { icon: "🎯", name: "Health Score Weighting", formula: "savings 40% · debt 30% · goals 20% · investments 10%", on: true },
];

export const ANALYTICS_CATEGORY_TOGGLES = [
  { label: "Include Pension in Net Worth", desc: "Uses pension value from manual entry", on: true },
  { label: "Include Business Assets", desc: "Clients can tag accounts as business assets", on: false },
  { label: "Exclude Foreign Currency", desc: "Only NGN balances in health score", on: false },
  { label: "Loan repayments as savings", desc: "Count mortgage repayment as wealth building", on: true },
];

export const BYOD_CONNECTION = {
  name: "Stanbic PostgreSQL · Primary",
  hostMasked: "postgres://•••••••••.amazonaws.com:5432/•••••••••",
  status: "Connected · Healthy",
  latency: "12ms avg",
  records: "48,201",
  lastSync: "2 min ago",
};

export const RESEARCH_MODELS = ["Claude Opus 4", "GPT-4o", "Gemini 1.5 Pro", "Claude Sonnet 4"];

export const RESEARCH_QUICK_PROMPTS = [
  { label: "MMF Comparison", prompt: "Compare ARM Money Market Fund vs Stanbic IBTC MMF vs Cowrywise Dollar Fund returns for 2026 YTD. Include current yield rates and liquidity terms." },
  { label: "Macro Brief", prompt: "What are the key macroeconomic signals in Nigeria right now that a wealth advisor should be discussing with clients? Include CBN rate decisions, inflation trend, and naira stability." },
  { label: "Lagos Property", prompt: "Summarise the current Lagos real estate market: price trends by area (Ikoyi, Lekki, VI, Ajah), rental yields, and outlook for 2026. Use recent data." },
];

export const GOALS_WRITTEN = [
  { client: "Tunde Kamara", status: "Accepted", meta: "Credit Card Payoff · ₦95,000 · Apr 30", progress: 0, color: "var(--gold)" },
  { client: "Kunle Okafor", status: "38% funded", meta: "Investment Portfolio · ₦5,000,000 · Dec 2026", progress: 38, color: "var(--green)" },
  { client: "Biodun James", status: "Pending accept", meta: "Emergency Fund · ₦1,200,000 · Jun 2026", progress: null, color: "var(--gold)" },
];

export const GOAL_CLIENT_OPTIONS = ["Tunde Kamara", "Biodun James", "Kunle Okafor", "Amaka Nwosu"];
export const GOAL_BUDDY_OPTIONS = ["Stanbic Wealth Advisor (AI)", "Adaeze Akunna (AI)", "The Contrarian (client's current buddy)"];

export type ApiEndpoint = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  desc: string;
  params: { name: string; type: string; req?: string; desc: string }[];
  example?: string;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/clients",
    desc: "List all clients with pagination and filtering",
    params: [
      { name: "status", type: "string", req: "optional", desc: "Filter by: active | pending | inactive" },
      { name: "health_score_min", type: "integer", req: "optional", desc: "Return only clients above this health score" },
      { name: "limit", type: "integer", req: "optional", desc: "Default 20, max 100" },
    ],
    example: `{"clients": [{"id": "usr_abc123","name": "Tunde Kamara","health_score": 78,"net_worth_ngn": 1075000,"data_sharing": "full","last_active": "2026-04-07T10:30:00Z"}],"total": 48,"page": 1}`,
  },
  {
    method: "GET",
    path: "/clients/{id}/analytics",
    desc: "Full financial analytics for a specific client",
    params: [
      { name: "id", type: "string", req: "required", desc: "Client user ID" },
      { name: "period", type: "string", req: "optional", desc: "1m | 3m | 6m | 1y | all · Default: 3m" },
      { name: "include", type: "string[]", req: "optional", desc: "spending | investments | cashflow | networth · Default: all" },
    ],
  },
  {
    method: "POST",
    path: "/clients/{id}/goals",
    desc: "Write a goal to a client's Goal Tracker",
    params: [
      { name: "title", type: "string", req: "required", desc: "Goal name shown to client" },
      { name: "target_amount_kobo", type: "integer", req: "required", desc: "Target amount in kobo (minor unit)" },
      { name: "target_date", type: "date", req: "required", desc: "ISO 8601 date" },
      { name: "advisor_note", type: "string", req: "optional", desc: "Shown to client with the goal" },
      { name: "require_acceptance", type: "boolean", req: "optional", desc: "Client must accept before goal is active · Default: true" },
    ],
  },
  {
    method: "POST",
    path: "/signals/publish",
    desc: "Publish a signal to trigger a client buddy conversation",
    params: [
      { name: "client_id", type: "string", req: "required", desc: "Target client (or \"all\" for broadcast)" },
      { name: "signal_type", type: "string", req: "required", desc: "property_listing | stock_alert | market_event | custom" },
      { name: "data", type: "object", req: "required", desc: "Signal payload — passed to buddy as context" },
      { name: "relevance_check", type: "boolean", req: "optional", desc: "Let AI check relevance before surfacing · Default: true" },
    ],
  },
  {
    method: "PATCH",
    path: "/agent-actions/{id}/approve",
    desc: "Approve or decline a pending agentic action",
    params: [
      { name: "decision", type: "string", req: "required", desc: "approve | decline" },
      { name: "partner_note", type: "string", req: "optional", desc: "Reason for decline, shown to client and buddy" },
    ],
  },
  {
    method: "POST",
    path: "/webhooks/register",
    desc: "Register a webhook for real-time partner events",
    params: [
      { name: "client.joined", type: "object", desc: "New client joined your partner workspace" },
      { name: "action.pending", type: "object", desc: "Agent action submitted for your approval" },
      { name: "client.health_drop", type: "object", desc: "Client health score drops by configured threshold" },
      { name: "goal.milestone", type: "object", desc: "Client reaches a goal milestone" },
      { name: "chat.invite", type: "object", desc: "Client invites partner to join a chat session" },
    ],
  },
];

/* ── Find a Partner (user-side) ── */
export type PartnerFirm = {
  id: string;
  name: string;
  type: string;
  icon: string;
  banner: string;
  iconBg: string;
  desc: string;
  tags: string[];
  rating: string;
  clients: string;
  minPortfolio: string;
};

export const PARTNER_FIRMS: PartnerFirm[] = [
  {
    id: "meristem",
    name: "Meristem Securities",
    type: "Investment Advisory",
    icon: "📈",
    banner: "linear-gradient(135deg,#1A3A6E,#0B2040)",
    iconBg: "#1A3A6E",
    desc: "Full-service stockbroking and investment advisory. Nigeria's leading independent research firm. Access to NGX, T-bills, Eurobonds and structured products.",
    tags: ["NGX Trading", "Portfolio Mgmt", "Research", "Free Intro"],
    rating: "4.9★",
    clients: "2,800+",
    minPortfolio: "₦50M+",
  },
  {
    id: "cowrywise",
    name: "Cowrywise Pro Advisory",
    type: "Wealth Management",
    icon: "🌱",
    banner: "linear-gradient(135deg,#1A5E1A,#0A3A0A)",
    iconBg: "#1A5E1A",
    desc: "Digital-first wealth management for the modern Nigerian. MMF, mutual funds, dollar investments, and now human advisor access for high-growth clients.",
    tags: ["MMF", "Mutual Funds", "Dollar Savings", "Free Intro"],
    rating: "4.8★",
    clients: "12,000+",
    minPortfolio: "₦0",
  },
  {
    id: "arm",
    name: "ARM Investment Managers",
    type: "Asset Management",
    icon: "🏛️",
    banner: "linear-gradient(135deg,#6B1A1A,#3A0A0A)",
    iconBg: "#6B1A1A",
    desc: "One of Nigeria's most trusted asset managers. ARM Money Market Fund, pension management, real estate investment trusts, and bespoke private wealth.",
    tags: ["MMF", "Pension", "REIT", "Private Wealth"],
    rating: "4.7★",
    clients: "85,000+",
    minPortfolio: "₦100M+",
  },
];

export const PARTNER_CATEGORY_FILTERS = [
  "All",
  "Wealth Management",
  "Investment Advisory",
  "Tax & Accounting",
  "Real Estate",
  "Business Finance",
  "Free Intro Call",
];

export type PartnerReview = { name: string; stars: string; text: string };

export const PARTNER_FIRM_DETAILS: Record<
  string,
  { fullDescription: string; includes: string[]; reviews: PartnerReview[] }
> = {
  meristem: {
    fullDescription:
      "Meristem Securities has operated in the Nigerian capital markets for over two decades, combining licensed brokerage execution with independent equity research. Clients get a named relationship manager, direct NGX trade execution, and access to fixed-income instruments (T-bills, Eurobonds, commercial paper) alongside their Smart Money AI buddy — the AI handles day-to-day questions, Meristem handles the trades and the paperwork.",
    includes: [
      "Named relationship manager",
      "NGX trade execution",
      "T-bills, Eurobonds & structured products",
      "Weekly equity research notes",
      "Free 30-minute intro consultation",
    ],
    reviews: [
      { name: "Adaobi K.", stars: "★★★★★", text: "My AI buddy flags the opportunities, my Meristem advisor executes them. Best of both worlds." },
      { name: "Segun T.", stars: "★★★★★", text: "Research quality is genuinely institutional-grade, not retail fluff." },
    ],
  },
  cowrywise: {
    fullDescription:
      "Cowrywise Pro Advisory extends the familiar Cowrywise savings and mutual fund product with a human advisor layer for clients who've outgrown pure self-serve investing. No minimum balance to start a relationship, transparent fee structure, and a strong focus on dollar-denominated savings for Nigerians managing currency risk.",
    includes: [
      "No minimum portfolio to join",
      "MMF & mutual fund access",
      "Dollar savings & FX guidance",
      "Quarterly portfolio check-ins",
      "Free 30-minute intro consultation",
    ],
    reviews: [
      { name: "Ifeoma B.", stars: "★★★★★", text: "Zero minimum was the reason I applied. Didn't expect this level of attention at my portfolio size." },
      { name: "Dapo A.", stars: "★★★★☆", text: "Good for getting started. Might outgrow it if my portfolio gets much bigger." },
    ],
  },
  arm: {
    fullDescription:
      "ARM Investment Managers is one of Nigeria's oldest and largest independent asset managers, running the ARM Money Market Fund alongside pension, real estate investment trust (REIT), and bespoke private wealth mandates. This tier is aimed at clients with meaningful assets who want a dedicated portfolio manager, not just fund access.",
    includes: [
      "Dedicated portfolio manager",
      "ARM Money Market Fund access",
      "Pension & REIT products",
      "Bespoke private wealth mandates",
      "Free intro consultation for qualifying portfolios",
    ],
    reviews: [
      { name: "Chukwuemeka O.", stars: "★★★★★", text: "Been with ARM's MMF for years. The advisor layer on top is a genuinely useful addition." },
      { name: "Halima Y.", stars: "★★★★☆", text: "Entry threshold is real, but the private wealth service justifies it." },
    ],
  },
};

export type MyPartnerAccessScope = {
  key: string;
  label: string;
  desc: string;
  on: boolean;
};

export const MY_PARTNER = {
  name: "Stanbic Wealth Management",
  advisor: "Adaeze Akunna",
  since: "Feb 2026",
};

export const MY_PARTNER_SCOPES: MyPartnerAccessScope[] = [
  { key: "transactions", label: "Transactions & Spending", desc: "Full DataBank transaction history and spending analytics", on: true },
  { key: "networth", label: "Net Worth & Investments", desc: "Account balances, assets, and investment holdings", on: true },
  { key: "goals", label: "Goals & Progress", desc: "Financial goals you've set and how you're tracking against them", on: true },
  { key: "chat", label: "Chat History", desc: "Past conversations with your AI Finance Buddies", on: false },
  { key: "actions", label: "Agentic Action Requests", desc: "Lets your partner review and approve agent actions above your set limit", on: true },
];
