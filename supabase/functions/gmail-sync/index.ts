import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const appUrl    = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!appUrl || !cronSecret) {
    return new Response(
      JSON.stringify({ error: "APP_URL or CRON_SECRET not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const response = await fetch(`${appUrl}/api/cron/gmail-sync`, {
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
});
