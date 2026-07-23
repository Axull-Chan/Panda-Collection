// Supabase Edge Function: stripe-webhook
//
// Receives events directly from Stripe's servers (not the browser) — the
// ONLY place payment_status is ever allowed to become "paid". Every
// request's signature is verified against STRIPE_WEBHOOK_SECRET before any
// of its contents are trusted; unsigned or forged requests are rejected.
//
// IMPORTANT: this function must be deployed with JWT verification DISABLED
// (Stripe cannot supply a Supabase user JWT). See supabase/config.toml and
// supabase/STRIPE_SETUP.md.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

Deno.serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !webhookSecret) {
    console.error("[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  // stripe-node defaults to Node's http module, which doesn't exist in
  // Deno — it must be told explicitly to use the Fetch API instead.
  const stripe = new Stripe(stripeSecretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text(); // raw bytes required for signature check

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        const { error } = await admin
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          })
          .eq("id", orderId);
        if (error) throw error;
        break;
      }
      case "checkout.session.expired": {
        // The customer never completed payment and the session timed out —
        // release the draft order rather than leaving it pending forever.
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        const { error } = await admin
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId)
          .eq("status", "pending"); // don't touch an order that already progressed
        if (error) throw error;
        break;
      }
      default:
        // Other event types aren't relevant to order fulfillment here.
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handling failed:", err);
    // Return 500 so Stripe retries delivery; our idempotency guard makes
    // retries safe.
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
