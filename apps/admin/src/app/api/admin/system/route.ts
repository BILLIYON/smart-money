import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Fetch database statistics
    const [
      { rows: dbSizeRows },
      { rows: userCountRows },
      { rows: buddyCountRows },
      { rows: msgCountRows },
      { rows: databankCountRows },
      { rows: goalCountRows },
      { rows: tableStatsRows },
    ] = await Promise.all([
      localPool.query("SELECT pg_size_pretty(pg_database_size('smart_money')) as size_pretty, pg_database_size('smart_money') as bytes;"),
      localPool.query("SELECT count(*) as total, count(*) FILTER (WHERE plan = 'pro') as pro_count, count(*) FILTER (WHERE onboarding_complete = true) as onboarded FROM users;"),
      localPool.query("SELECT count(*) as total, count(*) FILTER (WHERE status = 'live') as live, count(*) FILTER (WHERE status = 'pending') as pending FROM buddies;"),
      localPool.query("SELECT count(*) as total, count(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today FROM messages;"),
      localPool.query("SELECT count(*) as total, count(*) FILTER (WHERE source = 'gmail') as gmail_count FROM databank_entries;"),
      localPool.query("SELECT count(*) as total, count(*) FILTER (WHERE status = 'completed') as completed FROM goals;"),
      localPool.query(`
        SELECT relname as table_name, n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `),
    ]);

    const uptimeSeconds = Math.floor(process.uptime());

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      serverUptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      database: {
        sizePretty: dbSizeRows[0]?.size_pretty ?? "0 MB",
        bytes: parseInt(dbSizeRows[0]?.bytes ?? "0", 10),
        tables: tableStatsRows,
      },
      stats: {
        usersTotal: parseInt(userCountRows[0]?.total ?? "0", 10),
        usersPro: parseInt(userCountRows[0]?.pro_count ?? "0", 10),
        usersOnboarded: parseInt(userCountRows[0]?.onboarded ?? "0", 10),
        buddiesTotal: parseInt(buddyCountRows[0]?.total ?? "0", 10),
        buddiesLive: parseInt(buddyCountRows[0]?.live ?? "0", 10),
        buddiesPending: parseInt(buddyCountRows[0]?.pending ?? "0", 10),
        messagesTotal: parseInt(msgCountRows[0]?.total ?? "0", 10),
        messagesToday: parseInt(msgCountRows[0]?.today ?? "0", 10),
        databankEntries: parseInt(databankCountRows[0]?.total ?? "0", 10),
        gmailEntries: parseInt(databankCountRows[0]?.gmail_count ?? "0", 10),
        goalsTotal: parseInt(goalCountRows[0]?.total ?? "0", 10),
        goalsCompleted: parseInt(goalCountRows[0]?.completed ?? "0", 10),
      },
      models: [
        { name: "Claude 3.5 Sonnet", provider: "Anthropic", status: process.env.ANTHROPIC_API_KEY ? "active" : "standby", latencyMs: 380, loadPct: 42 },
        { name: "GPT-4o / GPT-4o-mini", provider: "OpenAI", status: process.env.OPENAI_API_KEY ? "active" : "standby", latencyMs: 410, loadPct: 28 },
        { name: "Gemini 2.0 Flash", provider: "Google AI", status: process.env.GOOGLE_AI_API_KEY ? "active" : "standby", latencyMs: 290, loadPct: 15 },
        { name: "Llama 3.3 70B", provider: "Groq", status: process.env.GROQ_API_KEY ? "active" : "standby", latencyMs: 190, loadPct: 10 },
        { name: "Gemma 2 27B / NIM", provider: "NVIDIA Build", status: process.env.NVIDIA_API_KEY ? "active" : "standby", latencyMs: 240, loadPct: 5 },
      ],
    });
  } catch (err: any) {
    console.error("[API System Telemetry Error]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch system telemetry" }, { status: 500 });
  }
}
