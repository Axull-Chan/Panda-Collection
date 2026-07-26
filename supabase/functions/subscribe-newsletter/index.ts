// Supabase Edge Function: subscribe-newsletter
//
// Newsletter signups used to be a direct anon-key insert from the browser,
// which meant there was no way to rate-limit them — Postgres/RLS has no
// visibility into the caller's IP. Routing the write through here instead
// gives us that: the signup is rate-limited per IP before it ever reaches
// the table.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SIGNUPS = 5;
const WINDOW_SECONDS = 3600; // 1 hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { email } = (await req.json()) as { email?: string };
    const trimmed = (email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    // Anonymous visitors have no user id — the caller's IP is the only
    // identifier available, and the only one that makes sense for spam
    // prevention here. Supabase's edge network sets x-forwarded-for.
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

    const { data: withinLimit, error: rateLimitError } = await admin.rpc("check_rate_limit", {
      p_bucket: "newsletter",
      p_identifier: ip,
      p_max_count: MAX_SIGNUPS,
      p_window_seconds: WINDOW_SECONDS,
    });
    if (rateLimitError) throw rateLimitError;
    if (withinLimit === false) {
      return json(
        { error: "Too many signups from this connection — please try again later." },
        429
      );
    }

    const { error: insertError } = await admin
      .from("newsletter_signups")
      .insert({ email: trimmed });

    // 23505 = unique violation: the address is already subscribed, which
    // is a success from the visitor's point of view, not an error.
    if (insertError && insertError.code !== "23505") throw insertError;

    return json({ ok: true });
  } catch (err) {
    console.error("[subscribe-newsletter]", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
