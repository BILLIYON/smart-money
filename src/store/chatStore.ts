import { create } from "zustand";

function extractAgentAction(content: string) {
  let agentCardData;
  let finalContent = content;
  const actionRegex = /\[AGENT_ACTION:\s*(\{[\s\S]*?\})\s*\]/;
  const match = actionRegex.exec(content);
  if (match) {
    try {
      const payload = JSON.parse(match[1]);
      agentCardData = {
        title: payload.title || "Proposed Action",
        action: payload.action || "Execute Transaction",
        amount: payload.amount ? `₦${(payload.amount / 100).toLocaleString()}` : "-",
        from: "Smart Money Wallet",
        fee: "₦0",
        benefit: "AI Recommended",
        benefitColor: "var(--green2)",
      };
      finalContent = content.replace(actionRegex, "").trim();
    } catch (e) {
      console.error("Failed to parse agentCardData", e);
    }
  }
  return { finalContent, agentCardData };
}

function extractGoalData(content: string, buddyName: string) {
  let goalCardData;
  let finalContent = content;
  const goalRegex = /\[GOAL:\s*(\{[\s\S]*?\})\s*\]/;
  const match = goalRegex.exec(content);
  if (match) {
    try {
      const payload = JSON.parse(match[1]);
      goalCardData = {
        name: payload.name || "New Financial Goal",
        amount: payload.amount || "₦0",
        date: payload.date || "TBD",
        buddyName,
      };
      finalContent = content.replace(goalRegex, "").trim();
    } catch (e) {
      console.error("Failed to parse goalCardData", e);
    }
  }
  return { finalContent, goalCardData };
}

function extractDatabankWriteData(content: string) {
  let databankWriteData;
  let finalContent = content;
  const writeRegex = /\[DATABANK_WRITE:\s*(\{[\s\S]*?\})\s*\]/;
  const match = writeRegex.exec(content);
  if (match) {
    try {
      databankWriteData = JSON.parse(match[1]);
      finalContent = content.replace(writeRegex, "").trim();
    } catch (e) {
      console.error("Failed to parse databankWriteData", e);
    }
  }
  return { finalContent, databankWriteData };
}


export type InsightHighlight = { label: string; text: string };
export type SpendBar = { label: string; width: string; color: string; amount: string };
export type SpendChart = { title: string; bars: SpendBar[] };

export type GoalCardData = {
  name: string; amount: string; date: string; buddyName: string;
};

export type AgentCardData = {
  title: string;
  action: string;
  amount: string;
  from: string;
  fee: string;
  benefit: string;
  benefitColor?: string;
};

export type DatabankWriteEntry = {
  description: string;
  amount: number;
  entry_type: "expense" | "income" | "subscription" | "asset" | "debt";
  category?: string;
  date?: string;
};

export type DatabankWriteCardData = {
  entries?: DatabankWriteEntry[];
  goal?: {
    title: string;
    target_amount: number;
    target_date?: string;
  };
};

export type ChatMessage = {
  id: string;
  role: "ai" | "user";
  content: string;
  time: string;
  streaming?: boolean;
  // group chat only — which buddy sent this
  buddyId?: string;
  // embedded blocks
  insightHighlight?: InsightHighlight;
  spendChart?: SpendChart;
  // action UI state
  showActions?: boolean;
  goalCardOpen?: boolean;
  goalCardData?: GoalCardData;
  goalCardDone?: boolean;
  agentCardOpen?: boolean;
  agentCardData?: AgentCardData;
  agentCardDone?: boolean;
  agentCardRef?: string;
  showFollowUp?: boolean;
  followUpDone?: boolean;
  followUpStartTime?: number;
  // agentic databank write card
  databankWriteData?: DatabankWriteCardData;
  databankWriteDone?: boolean;
};

// ── Seed thread ────────────────────────────────────────────
const DEFAULT_CONTRARIAN_THREAD: ChatMessage[] = [
  {
    id: "c1",
    role: "ai",
    content:
      "Good morning. I noticed a ₦450,000 credit hit your GTBank account this morning — likely your March salary. Before you do anything else with it, let's talk about your current position.\n\nWhat's your first instinct about where this money goes?",
    time: "9:14 AM",
    insightHighlight: {
      label: "📊 From your DataBank",
      text: "Top 3 spend last month: Food & Dining (₦82k), Subscriptions (₦34k), Transport (₦28k). Combined: 32% of your income.",
    },
    spendChart: {
      title: "📊 Last Month Spending Breakdown",
      bars: [
        { label: "Food & Dining", width: "68%", color: "var(--green)", amount: "₦82k" },
        { label: "Subscriptions", width: "42%", color: "var(--gold)",  amount: "₦34k" },
        { label: "Transport",     width: "33%", color: "#4A90D9",      amount: "₦28k" },
        { label: "Shopping",      width: "22%", color: "#9B59B6",      amount: "₦19k" },
        { label: "Utilities",     width: "14%", color: "var(--muted)", amount: "₦12k" },
      ],
    },
    showActions: true,
    goalCardData: { name: "Build 6-month Emergency Fund", amount: "₦900,000", date: "Sep 2026", buddyName: "The Contrarian Investor" },
  },
  {
    id: "c2",
    role: "user",
    content: "I was thinking about paying off debt and maybe putting something in real estate. My uncle keeps saying land is the best investment.",
    time: "9:16 AM",
  },
  {
    id: "c3",
    role: "ai",
    content:
      "Your uncle isn't wrong about land — but I'd push back on the timing.\n\nYour ₦34k/month in subscriptions is the low-hanging fruit. That's ₦408k a year leaving quietly. Audit every single one before committing to land.\n\nMy sequence: (1) audit subscriptions, (2) deploy ₦200k against debt, (3) park ₦150k in a T-bill while you research land properly.",
    time: "9:17 AM",
    insightHighlight: {
      label: "📰 Nairametrics · Today",
      text: "CBN held MPR at 27.5% this week. Paying off variable-rate debt right now is a guaranteed 27%+ return.",
    },
    showActions: true,
    showFollowUp: true,
    goalCardData: { name: "Pay off credit card debt", amount: "₦95,000", date: "Apr 2026", buddyName: "The Contrarian Investor" },
    agentCardData: {
      title: "Deploy ₦200,000 Against Debt",
      action: "Transfer to GTBank Credit Card",
      amount: "₦200,000",
      from: "Smart Money Wallet (bal: ₦85k) + GTBank",
      fee: "₦0",
      benefit: "~₦48,000/year",
      benefitColor: "var(--green2)",
    },
  },
];

// ── Group seed thread ───────────────────────────────────────
const SYSTEM_MSG: ChatMessage = {
  id: "sys-1",
  role: "ai",
  content: "__system__Group chat started · The Contrarian Investor & Warren Buffett (Fan Sim) · Both have access to your DataBank",
  time: "",
  buddyId: "__system__",
};

const DEFAULT_GROUP_THREAD: ChatMessage[] = [
  SYSTEM_MSG,
  {
    id: "g-u1",
    role: "user",
    content: "I just got my salary — ₦450k. I have ₦95k in credit card debt at 24%. Should I pay it off completely, or split and invest some?",
    time: "9:14 AM",
  },
  {
    id: "g-a1",
    role: "ai",
    buddyId: "buffett",
    content: "Pay it off. A 24% guaranteed return is better than anything I can reliably find in the market right now. Eliminating that debt is the highest-return investment available to you today.",
    time: "9:15 AM",
    insightHighlight: { label: "📊 Based on your DataBank", text: "Your credit card balance is ₦95,000 at 24% APR — that's ₦22,800/year in interest you're currently paying." },
    showActions: true,
  },
  {
    id: "g-a2",
    role: "ai",
    buddyId: "contrarian",
    content: "I agree with WB on the debt — pay it off. Where I'd push further: look at your ₦34k/month in subscriptions first. That's ₦408k/year haemorrhaging quietly. Kill the debt, then immediately redirect what was your monthly card minimum into a T-bill.",
    time: "9:16 AM",
    insightHighlight: { label: "📰 Nairametrics · Today", text: "T-bill yields are at 16.4% — risk-free, liquid in 48hrs. After the debt is cleared, this is the holding position while you decide your next move." },
    showActions: true,
  },
  {
    id: "g-a3",
    role: "ai",
    buddyId: "buffett",
    content: "Agreed on the subscriptions — that's the kind of leak that compounds into real wealth destruction over time. The T-bill suggestion is sound. Build the habit of putting idle money to work immediately, even at low risk.",
    time: "9:17 AM",
    showActions: true,
  },
];

// ── Group definitions ───────────────────────────────────────
export type GroupDef = {
  id: string;
  name: string;
  preview: string;
  hasUnread: boolean;
  buddyIds: string[];
  avatars: { bg: string; content: string; serif: boolean }[];
};

export const GROUPS: GroupDef[] = [
  {
    id: "investment-council",
    name: "Investment Council",
    preview: '2 buddies · WB: "Hold through the..."',
    hasUnread: true,
    buddyIds: ["contrarian", "buffett"],
    avatars: [
      { bg: "#132952", content: "🎯", serif: false },
      { bg: "#2D5A2D", content: "WB", serif: true },
    ],
  },
  {
    id: "debt-war-room",
    name: "Debt War Room",
    preview: '2 buddies · DR: "Gazelle intensity..."',
    hasUnread: false,
    buddyIds: ["ramsey", "lagos"],
    avatars: [
      { bg: "#004070", content: "DR", serif: true },
      { bg: "#1A5E1A", content: "🌱", serif: false },
    ],
  },
  {
    id: "full-council",
    name: "Full Finance Council",
    preview: "3 buddies · Last: salary advice",
    hasUnread: false,
    buddyIds: ["contrarian", "cardone", "kiyosaki"],
    avatars: [
      { bg: "#132952", content: "🎯", serif: false },
      { bg: "#3A1060", content: "GC", serif: true },
      { bg: "#701010", content: "RK", serif: true },
    ],
  },
];

// ── Session type ────────────────────────────────────────────
export type ChatSession = {
  id: string;
  buddy_ids: string[];
  session_name: string | null;
  is_group: boolean;
  created_at: string;
  last_message_at: string | null;
};

// ── Signal alert type ────────────────────────────────────────
export type SignalAlert = {
  id: string;
  buddyId: string;
  buddyName: string;
  headline: string;
  body: string;
  sourceName: string;
  sessionId: string;
  createdAt: string;
};

// ── Store ───────────────────────────────────────────────────
type ChatStore = {
  chatMode: "1to1" | "group";
  setChatMode: (m: "1to1" | "group") => void;

  // 1:1
  activeBuddyId: string;
  setActiveBuddyId: (id: string) => void;
  threads: Record<string, ChatMessage[]>;
  initThread: (buddyId: string, seed?: ChatMessage[]) => void;
  addMessage: (buddyId: string, msg: ChatMessage) => void;
  appendToken: (buddyId: string, msgId: string, token: string) => void;
  finalizeStream: (buddyId: string, msgId: string) => void;
  updateMessage: (buddyId: string, msgId: string, patch: Partial<ChatMessage>) => void;

  // group
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  groupThreads: Record<string, ChatMessage[]>;
  initGroupThread: (groupId: string, seed?: ChatMessage[]) => void;
  addGroupMessage: (groupId: string, msg: ChatMessage) => void;
  appendGroupToken: (groupId: string, msgId: string, token: string) => void;
  finalizeGroupStream: (groupId: string, msgId: string) => void;
  updateGroupMessage: (groupId: string, msgId: string, patch: Partial<ChatMessage>) => void;

  // modal
  showNewGroupModal: boolean;
  setShowNewGroupModal: (v: boolean) => void;

  // streaming
  isStreaming: boolean;
  setStreaming: (s: boolean) => void;

  // follow-up
  dismissFollowUp: (buddyId: string, msgId: string) => void;

  // ── Cross-session memory toggle ─────────────────────────
  enableCrossSessionMemory: boolean;
  setEnableCrossSessionMemory: (v: boolean) => void;
  toggleCrossSessionMemory: () => void;

  // ── Session management (persisted sessions from DB) ──────
  sessions: ChatSession[];
  activeSessionId: string | null;
  loadSessions: () => Promise<void>;
  setActiveSession: (sessionId: string) => void;
  createNewSession: (buddyId: string, title?: string) => Promise<string | null>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  loadRecentHistoryForBuddy: (buddyId: string) => Promise<void>;

  /**
   * Sends a message in the active 1-to-1 session, streams the response,
   * and appends tokens in real time.
   */
  sendMessage: (content: string, databankContext?: Record<string, unknown>) => Promise<void>;

  /** Called by RealtimeProvider when a signal message arrives via Supabase Realtime. */
  addSignalAlert: (alert: SignalAlert) => void;

  // Active signal alerts (dismissed after user interaction)
  signalAlerts: SignalAlert[];
  dismissSignalAlert: (id: string) => void;

  // Pre-fill the message input (e.g. from "Discuss first" in agent card)
  pendingInput: string;
  preFillInput: (text: string) => void;
  clearPendingInput: () => void;

  // Contextual suggestion chips for the current thread
  suggestions: string[];
  setSuggestions: (s: string[]) => void;

  // DataBank connection state — drives the in-chat nudge card
  hasConnectedDatabank: boolean;
  setHasConnectedDatabank: (v: boolean) => void;
  showDatabankNudge: boolean;
  setShowDatabankNudge: (v: boolean) => void;
};

function patchMsg(msgs: ChatMessage[], msgId: string, patch: Partial<ChatMessage>): ChatMessage[] {
  return msgs.map((m) => (m.id === msgId ? { ...m, ...patch } : m));
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chatMode: "1to1",
  setChatMode: (m) => set({ chatMode: m }),

  activeBuddyId: "contrarian",
  setActiveBuddyId: (id) => set({ activeBuddyId: id }),

  threads: { contrarian: DEFAULT_CONTRARIAN_THREAD },

  initThread: (buddyId, seed = []) =>
    set((s) => s.threads[buddyId] ? s : { threads: { ...s.threads, [buddyId]: seed } }),

  addMessage: (buddyId, msg) =>
    set((s) => ({ threads: { ...s.threads, [buddyId]: [...(s.threads[buddyId] ?? []), msg] } })),

  appendToken: (buddyId, msgId, token) =>
    set((s) => ({
      threads: {
        ...s.threads,
        [buddyId]: patchMsg(s.threads[buddyId] ?? [], msgId, {
          content: ((s.threads[buddyId] ?? []).find((m) => m.id === msgId)?.content ?? "") + token,
          streaming: true,
        }),
      },
    })),

  finalizeStream: (buddyId, msgId) =>
    set((s) => {
      const thread = s.threads[buddyId] ?? [];
      const msg = thread.find((m) => m.id === msgId);
      const rawContent = msg?.content ?? "";
      // first extract agent action, then goal, then databank writes
      const { finalContent: afterAgent, agentCardData } = extractAgentAction(rawContent);
      const buddyName = buddyId; // will be overridden by the buddy's display name in the UI
      const { finalContent: afterGoal, goalCardData } = extractGoalData(afterAgent, buddyName);
      const { finalContent, databankWriteData } = extractDatabankWriteData(afterGoal);
      return {
        threads: {
          ...s.threads,
          [buddyId]: patchMsg(thread, msgId, {
            streaming: false,
            showActions: true,
            content: finalContent,
            agentCardData,
            goalCardData,
            databankWriteData,
            databankWriteDone: !!databankWriteData,
          }),
        },
      };
    }),

  updateMessage: (buddyId, msgId, patch) =>
    set((s) => ({ threads: { ...s.threads, [buddyId]: patchMsg(s.threads[buddyId] ?? [], msgId, patch) } })),

  // group
  activeGroupId: "investment-council",
  setActiveGroupId: (id) => set({ activeGroupId: id }),

  groupThreads: { "investment-council": DEFAULT_GROUP_THREAD },

  initGroupThread: (groupId, seed = []) =>
    set((s) => s.groupThreads[groupId] ? s : { groupThreads: { ...s.groupThreads, [groupId]: seed } }),

  addGroupMessage: (groupId, msg) =>
    set((s) => ({ groupThreads: { ...s.groupThreads, [groupId]: [...(s.groupThreads[groupId] ?? []), msg] } })),

  appendGroupToken: (groupId, msgId, token) =>
    set((s) => ({
      groupThreads: {
        ...s.groupThreads,
        [groupId]: patchMsg(s.groupThreads[groupId] ?? [], msgId, {
          content: ((s.groupThreads[groupId] ?? []).find((m) => m.id === msgId)?.content ?? "") + token,
          streaming: true,
        }),
      },
    })),

  finalizeGroupStream: (groupId, msgId) =>
    set((s) => {
      const thread = s.groupThreads[groupId] ?? [];
      const msg = thread.find((m) => m.id === msgId);
      const rawContent = msg?.content ?? "";
      const { finalContent: afterAgent, agentCardData } = extractAgentAction(rawContent);
      const buddyName = msg?.buddyId ?? groupId;
      const { finalContent: afterGoal, goalCardData } = extractGoalData(afterAgent, buddyName);
      const { finalContent, databankWriteData } = extractDatabankWriteData(afterGoal);
      return {
        groupThreads: {
          ...s.groupThreads,
          [groupId]: patchMsg(thread, msgId, {
            streaming: false,
            showActions: true,
            content: finalContent,
            agentCardData,
            goalCardData,
            databankWriteData,
            databankWriteDone: !!databankWriteData,
          }),
        },
      };
    }),

  updateGroupMessage: (groupId, msgId, patch) =>
    set((s) => ({
      groupThreads: {
        ...s.groupThreads,
        [groupId]: patchMsg(s.groupThreads[groupId] ?? [], msgId, patch),
      },
    })),

  showNewGroupModal: false,
  setShowNewGroupModal: (v) => set({ showNewGroupModal: v }),

  isStreaming: false,
  setStreaming: (s) => set({ isStreaming: s }),

  dismissFollowUp: (buddyId, msgId) =>
    set((s) => ({ threads: { ...s.threads, [buddyId]: patchMsg(s.threads[buddyId] ?? [], msgId, { showFollowUp: false }) } })),

  // ── Cross-session memory toggle ─────────────────────────
  enableCrossSessionMemory: true,
  setEnableCrossSessionMemory: (v) => set({ enableCrossSessionMemory: v }),
  toggleCrossSessionMemory: () => set((s) => ({ enableCrossSessionMemory: !s.enableCrossSessionMemory })),

  // ── Session management ───────────────────────────────────
  sessions: [],
  activeSessionId: null,

  loadSessions: async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as ChatSession[];
      set({ sessions: data });
    } catch (e) {
      console.error("[chatStore] loadSessions:", e);
    }
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  createNewSession: async (buddyId, title) => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buddyIds: [buddyId],
          sessionName: title ?? null,
          isGroup: false,
        }),
      });
      if (res.ok) {
        const newSess = (await res.json()) as ChatSession;
        set((s) => ({
          sessions: [newSess, ...s.sessions],
          activeSessionId: newSess.id,
          threads: { ...s.threads, [buddyId]: [] },
        }));
        return newSess.id;
      }
    } catch (e) {
      console.error("[chatStore] createNewSession:", e);
    }
    return null;
  },

  renameSession: async (sessionId, newTitle) => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sessionName: newTitle }),
      });
      if (res.ok) {
        set((s) => ({
          sessions: s.sessions.map((sess) => (sess.id === sessionId ? { ...sess, session_name: newTitle } : sess)),
        }));
      }
    } catch (e) {
      console.error("[chatStore] renameSession:", e);
    }
  },

  deleteSession: async (sessionId) => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== sessionId),
          activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId,
        }));
      }
    } catch (e) {
      console.error("[chatStore] deleteSession:", e);
    }
  },

  loadSessionMessages: async (sessionId) => {
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.session && data.messages) {
        const buddyId = data.session.buddy_ids?.[0] ?? get().activeBuddyId;
        set((s) => ({
          activeSessionId: sessionId,
          activeBuddyId: buddyId,
          threads: { ...s.threads, [buddyId]: data.messages },
        }));
      }
    } catch (e) {
      console.error("[chatStore] loadSessionMessages:", e);
    }
  },

  loadRecentHistoryForBuddy: async (buddyId) => {
    try {
      const res = await fetch(`/api/chat/messages?buddyId=${buddyId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.session && data.messages && data.messages.length > 0) {
        set((s) => ({
          activeSessionId: data.session.id,
          activeBuddyId: buddyId,
          threads: { ...s.threads, [buddyId]: data.messages },
        }));
      } else {
        const sessId = await get().createNewSession(buddyId);
        if (sessId) set({ activeSessionId: sessId });
      }
    } catch (e) {
      console.error("[chatStore] loadRecentHistoryForBuddy:", e);
    }
  },

  sendMessage: async (content, databankContext = {}) => {
    const s = get();
    const buddyId = s.activeBuddyId;

    // 1. Append user message immediately
    const userMsgId = `u-${Date.now()}`;
    s.addMessage(buddyId, {
      id: userMsgId,
      role: "user",
      content,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    // 2. Append empty AI placeholder
    const aiMsgId = `ai-${Date.now()}`;
    s.addMessage(buddyId, {
      id: aiMsgId,
      role: "ai",
      content: "",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      streaming: true,
    });

    set({ isStreaming: true });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buddyId,
          sessionId: get().activeSessionId,
          databankContext,
          enableCrossSessionMemory: get().enableCrossSessionMemory,
          messages: (get().threads[buddyId] ?? [])
            .filter((m) => !m.streaming && m.role !== "ai" || m.id !== aiMsgId)
            .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        get().appendToken(buddyId, aiMsgId, token);
      }

      get().finalizeStream(buddyId, aiMsgId);
      // Reload sessions after stream completes to pick up auto-generated topic titles
      setTimeout(() => get().loadSessions(), 1500);
    } catch (e) {
      console.error("[chatStore] sendMessage:", e);
      get().updateMessage(buddyId, aiMsgId, {
        content: "Sorry, something went wrong. Please try again.",
        streaming: false,
      });
    } finally {
      set({ isStreaming: false });
    }
  },

  // ── Signal alerts ────────────────────────────────────────
  signalAlerts: [],

  addSignalAlert: (alert) =>
    set((s) => ({ signalAlerts: [alert, ...s.signalAlerts] })),

  dismissSignalAlert: (id) =>
    set((s) => ({ signalAlerts: s.signalAlerts.filter((a) => a.id !== id) })),

  pendingInput: "",
  preFillInput: (text) => set({ pendingInput: text }),
  clearPendingInput: () => set({ pendingInput: "" }),

  suggestions: [],
  setSuggestions: (s) => set({ suggestions: s }),

  hasConnectedDatabank: false,
  setHasConnectedDatabank: (v) => set({ hasConnectedDatabank: v }),
  showDatabankNudge: false,
  setShowDatabankNudge: (v) => set({ showDatabankNudge: v }),
}));
