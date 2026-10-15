import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ chips: ["⚠️ No data connected"], sources: [] });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });

  try {
    const [uploadRes, gmailRes, signalRes] = await Promise.all([
      pool.query(`SELECT count(*)::int as count FROM databank_entries WHERE user_id = $1 AND source = 'upload';`, [user.id]),
      pool.query(`SELECT provider FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`, [user.id]),
      pool.query(`SELECT source_id FROM user_signal_sources WHERE user_id = $1 AND enabled = true;`, [user.id]),
    ]);

    const chips: string[] = [];
    if ((uploadRes.rows[0]?.count ?? 0) > 0) chips.push("📊 Statement");
    if (gmailRes.rows.length > 0) chips.push("📧 Gmail");
    if (signalRes.rows.length > 0) chips.push("📰 Signals");

    if (chips.length === 0) {
      chips.push("⚠️ No data connected");
    }

    return NextResponse.json({
      chips,
      hasUploads: (uploadRes.rows[0]?.count ?? 0) > 0,
      hasGmail: gmailRes.rows.length > 0,
      signals: signalRes.rows.map((r: any) => r.source_id),
    });
  } catch (err: any) {
    console.error("[GET /api/databank/sources-summary] Error:", err);
    return NextResponse.json({ chips: ["⚠️ No data connected"], sources: [] });
  } finally {
    await pool.end();
  }
}
