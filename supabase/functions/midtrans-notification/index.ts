// Supabase Edge Function: midtrans-notification
//
// Midtrans counterpart to stripe-webhook — receives HTTP notifications
// directly from Midtrans's servers (not the browser), and is the ONLY
// place payment_status is ever allowed to become "paid" for a Midtrans
// order. Every request's signature_key is verified against a hash computed
// from MIDTRANS_SERVER_KEY before any of its contents are trusted.
//
// Unlike Stripe, Midtrans signs specific fields (order_id, status_code,
// gross_amount) rather than the raw request body, so there's no need to
// read the body as raw text the way stripe-webhook does for its HMAC check.
//
// IMPORTANT: this function must be deployed with JWT verification DISABLED
// (Midtrans cannot supply a Supabase user JWT). See supabase/config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";

interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id: string;
  fraud_status?: string;
}

async function sha512Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const midtransServerKey = Deno.env.get("MIDTRANS_SERVER_KEY");
  if (!midtransServerKey) {
    console.error("[midtrans-notification] missing MIDTRANS_SERVER_KEY");
    return new Response("Server misconfigured", { status: 500 });
  }

  let notification: MidtransNotification;
  try {
    notification = (await req.json()) as MidtransNotification;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount } = notification;
  if (!orderId || !statusCode || !grossAmount || !notification.signature_key) {
    return new Response("Missing required fields", { status: 400 });
  }

  const expectedSignature = await sha512Hex(
    `${orderId}${statusCode}${grossAmount}${midtransServerKey}`
  );
  if (expectedSignature !== notification.signature_key) {
    console.error("[midtrans-notification] signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { transaction_status: status, fraud_status: fraudStatus } = notification;

    if (
      status === "settlement" ||
      (status === "capture" && (fraudStatus === undefined || fraudStatus === "accept"))
    ) {
      const { error } = await admin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "processing",
          midtrans_transaction_id: notification.transaction_id,
        })
        .eq("id", orderId);
      if (error) throw error;
    } else if (status === "expire" || status === "cancel" || status === "deny") {
      // The customer never completed payment (or it was rejected) — release
      // the draft order rather than leaving it pending forever.
      const { error } = await admin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending"); // don't touch an order that already progressed
      if (error) throw error;
    }
    // "pending" (e.g. a VA number was issued but not yet paid) and any other
    // status need no action here — the customer just hasn't paid yet.
  } catch (err) {
    console.error("[midtrans-notification] handling failed:", err);
    // Return 500 so Midtrans retries delivery; the idempotent triggers on
    // `orders` (mark_stock_decremented, set_paid_at, mark_coupon_usage_counted)
    // make retries safe regardless of how many times this fires.
    return new Response("Notification handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
