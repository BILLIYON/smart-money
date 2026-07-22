import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

// In-memory fallback ticket store so tickets persist across sessions during development
export type Ticket = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  rating: number;
  type: "feature" | "review" | "bug" | "support";
  category: string;
  subject: string;
  message: string;
  aiReply: string;
  adminReply?: string;
  status: "new" | "in_progress" | "resolved" | "implemented";
  created_at: string;
};

// Global in-memory seed tickets
let IN_MEMORY_TICKETS: Ticket[] = [
  {
    id: "SM-948120",
    userId: "u-1",
    userEmail: "adeolujohn495@gmail.com",
    userName: "John Abioye",
    rating: 5,
    type: "feature",
    category: "DataBank & Gmail Sync",
    subject: "Replace theme toggle with Contact Us & Reviews button",
    message: "Can we replace the theme colour change icon with a contact us button icon that allows users to write reviews on how to make the app better",
    aiReply: "💡 Outstanding feature idea! We've logged your request in our high-priority product roadmap.",
    status: "implemented",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "SM-837194",
    userId: "u-2",
    userEmail: "tunde.a@gmail.com",
    userName: "Tunde Adebayo",
    rating: 5,
    type: "feature",
    category: "DataBank & Gmail Sync",
    subject: "Zero-quota regex email alert parser for Nigerian banks",
    message: "Remove AI quota dependency when syncing email bank alerts. Use regex rules instead of calling OpenAI.",
    aiReply: "💡 Excellent suggestion! The zero-quota regex email parser has been implemented.",
    status: "implemented",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "SM-720193",
    userId: "u-3",
    userEmail: "chioma.k@gmail.com",
    userName: "Chioma Kalu",
    rating: 5,
    type: "review",
    category: "UI Design & Aesthetics",
    subject: "Customized Smart Money Popup Alerts",
    message: "Replace standard browser native alert and confirm popups with specialized dark glassmorphic dialogs.",
    aiReply: "🎉 Thank you for the glowing 5-star review! The customized popup alert system is live across the app.",
    status: "implemented",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "SM-610284",
    userId: "u-4",
    userEmail: "emeka.o@yahoo.com",
    userName: "Emeka Okonkwo",
    rating: 4,
    type: "feature",
    category: "DataBank & Gmail Sync",
    subject: "Multi-Bank Account Balances Card",
    message: "Show liquid account balances across all connected Nigerian banks right below the Health Score overview card.",
    aiReply: "💡 Great request! The Multi-Bank Accounts card has been placed in Spending Analytics.",
    status: "implemented",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: "SM-519201",
    userId: "u-5",
    userEmail: "aisha.m@outlook.com",
    userName: "Aisha Mohammed",
    rating: 5,
    type: "bug",
    category: "AI Buddies & Chat",
    subject: "Auto net worth forecasting prompt",
    message: "Can Finance Buddy calculate a 6-month projected savings forecast based on recent transactions?",
    aiReply: "🛠️ Thank you! We've assigned this to our core AI squad for the next release.",
    status: "in_progress",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export async function POST(req: Request) {
  try {
    const { supabase, userId, error } = await requireAuth();
    if (error || !supabase) {
      return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rating, type, subject, message, category } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get user details
    const { data: userProfile } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    const userEmail = userProfile?.email || "user@smartmoney.app";
    const userName = userProfile?.full_name || "Smart Money User";

    // AI Synthesis for instant response
    let aiReply = "Thank you so much for your feedback! Our engineering team has received your review and will use it to make Smart Money even better.";
    const lowerMsg = message.toLowerCase();
    if (type === "feature" || lowerMsg.includes("add") || lowerMsg.includes("feature") || lowerMsg.includes("should")) {
      aiReply = `💡 Outstanding feature idea! We've logged your request regarding "${subject || "your suggestion"}" in our high-priority product roadmap. Our dev squad and AI team are actively reviewing it.`;
    } else if (type === "bug" || lowerMsg.includes("fix") || lowerMsg.includes("error") || lowerMsg.includes("bug")) {
      aiReply = `🛠️ Thank you for bringing this to our attention! We've logged the technical report for our engineering squad.`;
    } else if (rating >= 4) {
      aiReply = `🎉 Thank you for the glowing ${rating}-star review! We're thrilled Smart Money is delivering value for your financial journey.`;
    } else if (rating > 0 && rating <= 3) {
      aiReply = `❤️ Thank you for your honest feedback. We take user satisfaction very seriously and are already acting on ways to streamline your experience.`;
    }

    const ticketId = `SM-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTicket: Ticket = {
      id: ticketId,
      userId: userId || "user",
      userEmail,
      userName,
      rating: rating || 5,
      type: type || "review",
      category: category || "General Experience",
      subject: subject || "User Feedback",
      message: message.trim(),
      aiReply,
      status: "new",
      created_at: new Date().toISOString(),
    };

    // Store in Supabase if table exists
    try {
      await supabase.from("feedback_tickets").insert({
        id: ticketId,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        rating: newTicket.rating,
        type: newTicket.type,
        category: newTicket.category,
        subject: newTicket.subject,
        message: newTicket.message,
        ai_reply: aiReply,
        status: "new",
      });
    } catch {
      // Fall back to memory
    }

    IN_MEMORY_TICKETS.unshift(newTicket);

    return NextResponse.json({
      ok: true,
      ticketId,
      aiReply,
      ticket: newTicket,
    });
  } catch (err) {
    console.error("[POST /api/contact]", err);
    return NextResponse.json({ error: "Failed to process feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { supabase, userId, error } = await requireAuth();
    if (error || !supabase) {
      return NextResponse.json(IN_MEMORY_TICKETS);
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Attempt Supabase fetch
    const { data: dbTickets } = await supabase
      .from("feedback_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbTickets && dbTickets.length > 0) {
      const formatted = dbTickets.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        userEmail: t.user_email || "user@smartmoney.app",
        userName: t.user_name || "User",
        rating: t.rating ?? 5,
        type: t.type ?? "review",
        category: t.category ?? "General",
        subject: t.subject ?? "Feedback",
        message: t.message,
        aiReply: t.ai_reply,
        adminReply: t.admin_reply,
        status: t.status ?? "new",
        created_at: t.created_at,
      }));
      return NextResponse.json(formatted);
    }

    return NextResponse.json(IN_MEMORY_TICKETS);
  } catch (err) {
    console.error("[GET /api/contact]", err);
    return NextResponse.json(IN_MEMORY_TICKETS);
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, userId, error } = await requireAuth();
    if (error || !supabase) {
      return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId, status, adminReply } = await req.json();

    const ticket = IN_MEMORY_TICKETS.find((t) => t.id === ticketId);
    if (ticket) {
      if (status) ticket.status = status;
      if (adminReply) ticket.adminReply = adminReply;
    }

    try {
      await supabase
        .from("feedback_tickets")
        .update({ status, admin_reply: adminReply })
        .eq("id", ticketId);
    } catch {
      // Ignored
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    console.error("[PATCH /api/contact]", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
