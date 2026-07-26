import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type SubscribeResult = "ok" | "invalid" | "rate_limited" | "error";

/**
 * Subscribes an email via the subscribe-newsletter Edge Function, which
 * rate-limits by IP before writing — a direct table insert can't do that,
 * since anonymous signups have no user id and RLS can't see the caller's IP.
 */
export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "invalid";

  const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
    body: { email: trimmed },
  });

  if (!error && data?.ok) return "ok";

  if (error instanceof FunctionsHttpError) {
    if (error.context.status === 429) return "rate_limited";
    try {
      const body = await error.context.json();
      if (body?.error) console.error("Newsletter signup failed:", body.error);
    } catch {
      // Response wasn't JSON — fall through to the generic error below.
    }
  } else if (error) {
    console.error("Newsletter signup failed:", error.message);
  }
  return "error";
}
