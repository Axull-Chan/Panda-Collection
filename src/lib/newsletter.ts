import { supabase } from "./supabase";

export type SubscribeResult = "ok" | "invalid" | "error";

/** Save an email to the newsletter_signups table. Duplicates count as success. */
export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "invalid";

  const { error } = await supabase.from("newsletter_signups").insert({ email: trimmed });

  if (!error) return "ok";
  // 23505 = unique violation: the address is already subscribed
  if (error.code === "23505") return "ok";
  console.error("Newsletter signup failed:", error.message);
  return "error";
}
