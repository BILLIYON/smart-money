import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function POST(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sync_mode, preset_filter, custom_query, ai_prompt, ai_engine, enable_fallback, fallback_engine, presets } = await req.json();

    const { rows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );

    const integration = rows[0];
    if (!integration) {
      return Response.json({ error: "Gmail integration not connected" }, { status: 404 });
    }

    const updatedMetadata = {
      ...(integration.metadata || {}),
      sync_mode: sync_mode || "lightweight",
      preset_filter: preset_filter || "all",
      custom_query: custom_query || "",
      ai_prompt: ai_prompt || "",
      ai_engine: ai_engine || "groq",
      enable_fallback: enable_fallback !== undefined ? Boolean(enable_fallback) : true,
      fallback_engine: fallback_engine || "groq",
    };

    if (presets) {
      updatedMetadata.presets = presets;
    }

    await pool.query(
      `UPDATE user_integrations SET metadata = $1 WHERE user_id = $2 AND provider = 'gmail';`,
      [JSON.stringify(updatedMetadata), user.id]
    );

    return Response.json({ ok: true, metadata: updatedMetadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settings";
    return Response.json({ error: message }, { status: 500 });
  }
}
