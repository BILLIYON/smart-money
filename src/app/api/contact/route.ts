import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { rating, type, subject, message, category, email, name } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let userId = user?.id || null;
    let userEmail = user?.email || (email ? email.trim().toLowerCase() : "");
    let userName = name ? name.trim() : "Smart Money User";

    // Require email for guest submissions to enable account tracking
    if (!userEmail) {
      return NextResponse.json(
        { error: "Please enter your email address so we can track and link your inquiry to your account." },
        { status: 400 }
      );
    }

    // If logged in, fetch full name
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) userName = profile.full_name;
    } else {
      // If guest submission, match email against existing users table to auto-link to account
      try {
        const { data: matchedUser } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("email", userEmail)
          .maybeSingle();

        if (matchedUser) {
          userId = matchedUser.id;
          if (!name && matchedUser.full_name) userName = matchedUser.full_name;
        }
      } catch {
        // Fallback if table query fails
      }
    }

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
      userId: userId || "guest",
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

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(req.url);
    const filterEmail = searchParams.get("email");

    // If query email provided, filter for that user
    if (filterEmail) {
      const emailLower = filterEmail.toLowerCase().trim();
      const filtered = IN_MEMORY_TICKETS.filter((t) => t.userEmail.toLowerCase() === emailLower);
      return NextResponse.json(filtered);
    }

    // Check if user is admin
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      isAdmin = profile?.is_admin ?? false;
    }

    // Admin gets all tickets
    if (isAdmin) {
      try {
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
      } catch {
        // Ignored
      }
      return NextResponse.json(IN_MEMORY_TICKETS);
    }

    // Logged-in non-admin user gets their own tickets
    if (user?.email) {
      const userLower = user.email.toLowerCase().trim();
      const filtered = IN_MEMORY_TICKETS.filter((t) => t.userEmail.toLowerCase() === userLower);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(IN_MEMORY_TICKETS);
  } catch (err) {
    console.error("[GET /api/contact]", err);
    return NextResponse.json(IN_MEMORY_TICKETS);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
