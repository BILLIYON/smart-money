import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );

    const metadata = rows[0]?.metadata || {};
    return Response.json({ metadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load settings";
    return Response.json({ error: message }, { status: 500 });
  }
}

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
    const existingMetadata = (integration?.metadata as Record<string, any>) || {};

    const updatedMetadata: Record<string, any> = {
      ...existingMetadata,
      sync_mode: sync_mode || existingMetadata.sync_mode || "lightweight",
      preset_filter: preset_filter || existingMetadata.preset_filter || "all",
      custom_query: custom_query !== undefined ? custom_query : (existingMetadata.custom_query || ""),
      ai_prompt: ai_prompt !== undefined ? ai_prompt : (existingMetadata.ai_prompt || ""),
      ai_engine: ai_engine || existingMetadata.ai_engine || "groq",
      enable_fallback: enable_fallback !== undefined ? Boolean(enable_fallback) : (existingMetadata.enable_fallback !== undefined ? Boolean(existingMetadata.enable_fallback) : true),
      fallback_engine: fallback_engine || existingMetadata.fallback_engine || "groq",
    };

    if (presets) {
      updatedMetadata.presets = presets;
    }

    if (integration) {
      await pool.query(
        `UPDATE user_integrations SET metadata = $1 WHERE user_id = $2 AND provider = 'gmail';`,
        [JSON.stringify(updatedMetadata), user.id]
      );
    } else {
      await pool.query(
        `INSERT INTO user_integrations (user_id, provider, metadata) VALUES ($1, 'gmail', $2);`,
        [user.id, JSON.stringify(updatedMetadata)]
      );
    }

    return Response.json({ ok: true, metadata: updatedMetadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settings";
    return Response.json({ error: message }, { status: 500 });
  }
}
