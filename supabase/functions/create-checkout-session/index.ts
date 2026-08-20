// Supabase Edge Function: create-checkout-session
//
// Called by the authenticated storefront at checkout. Never trusts prices,
// stock, discounts, or totals sent by the browser — everything is re-read
// from the database here, server-side, before an order or a Stripe session
// is ever created. This closes the "tampered client" gap a pure
// client-side checkout would have.
//
// Flow: verify the caller's session -> re-price the cart from Postgres ->
// check real stock -> independently re-validate any coupon code against
// the current subtotal -> create the order + order_items (status: pending,
// payment_status: unpaid) -> create a Stripe Checkout Session mirroring
// those items (plus an ephemeral Stripe Coupon if a discount applies) ->
// store the session id on the order -> return the Stripe URL for the
// browser to redirect to.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { resolveCartLines, type CartLine } from "../_shared/pricing.ts";
import { validateCoupon } from "../_shared/coupons.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A double-click or rapid refresh within this window reuses the
// already-created Stripe session instead of spawning a new draft order.
const CHECKOUT_DEDUPE_WINDOW_MS = 10_000;
// Beyond that, cap sustained attempts — generous enough for "declined, fix
// the card, try again," tight enough to stop a script.
const CHECKOUT_MAX_ATTEMPTS = 5;
const CHECKOUT_WINDOW_SECONDS = 300;

interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface RequestBody {
  lines: CartLine[];
  address: Address;
  /** Trimmed, case-insensitive — re-validated here regardless of what the
   *  checkout page's own "Apply Coupon" preview already showed. */
  couponCode?: string;
  /** window.location.origin from the browser — more reliable than sniffing
   *  the Origin request header, which can be stripped/rewritten by proxies
   *  in front of the function. Needed to build absolute URLs: Stripe
   *  requires fully-qualified URLs for success_url/cancel_url and for any
   *  product image it displays on its own hosted page. */
  origin: string;
}

// IDR has no subdivision — round to the nearest whole Rupiah, not cents.
function roundIDR(n: number): number {
  return Math.round(n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured on this function.");
    }
    // stripe-node defaults to Node's http module, which doesn't exist in
    // Deno — it must be told explicitly to use the Fetch API instead.
    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const authHeader = req.headers.get("Authorization") ?? "";

    // Scoped client: verifies WHO is calling (their JWT), nothing more.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "You must be signed in to check out." }, 401);
    }

    // Privileged client: bypasses RLS for the trusted writes below. Never
    // exposed to the browser — this key only ever lives in this function.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // A double-click, a rapid refresh, or two open tabs shouldn't spawn a
    // second draft order — if this user already has a pending order with a
    // live Stripe session from the last few seconds, hand back that same
    // session instead of creating a new one.
    const { data: recentOrder } = await admin
      .from("orders")
      .select("stripe_session_id, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .not("stripe_session_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recentOrder?.stripe_session_id &&
      Date.now() - new Date(recentOrder.created_at).getTime() < CHECKOUT_DEDUPE_WINDOW_MS
    ) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(recentOrder.stripe_session_id);
        if (existing.status === "open" && existing.url) {
          return json({ url: existing.url });
        }
      } catch {
        // Not retrievable for some reason — fall through and create a new one.
      }
    }

    // Beyond accidental duplicates, cap how often one person can spin up new
    // checkout sessions at all.
    const { data: withinLimit, error: rateLimitError } = await admin.rpc("check_rate_limit", {
      p_bucket: "checkout",
      p_identifier: user.id,
      p_max_count: CHECKOUT_MAX_ATTEMPTS,
      p_window_seconds: CHECKOUT_WINDOW_SECONDS,
    });
    if (rateLimitError) throw rateLimitError;
    if (withinLimit === false) {
      return json(
        {
          error:
            "You're checking out a little quickly — please wait a few minutes and try again.",
        },
        429
      );
    }

    const body = (await req.json()) as RequestBody;
    const { lines, address, couponCode } = body;

    // Prefer the origin the browser tells us directly; the Origin header
    // can be absent or rewritten by proxies in front of this function.
    const origin = body.origin || req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      return json({ error: "Could not determine which site to return you to." }, 400);
    }
    const toAbsoluteUrl = (maybeRelative: string) =>
      maybeRelative.startsWith("http") ? maybeRelative : new URL(maybeRelative, originUrl).href;

    if (!address?.line1 || !address?.city || !address?.postal_code || !address?.country) {
      return json({ error: "Please provide a complete shipping address." }, 400);
    }

    // Re-price everything from the database. Client-sent prices are ignored.
    const pricing = await resolveCartLines(admin, lines);
    if (!pricing.ok) {
      return json({ error: pricing.error }, pricing.status);
    }
    const { resolved, subtotal } = pricing;

    // Independently re-validate the coupon against the real subtotal — the
    // checkout page's "Apply Coupon" preview is a UX convenience, not the
    // security boundary. A coupon could expire, hit its usage limit, or
    // never have been valid at all between that preview and this request.
    let discount = 0;
    let couponFields: {
      coupon_id: string;
      coupon_code: string;
      discount_type: string;
      discount_value: number;
    } | null = null;

    if (couponCode?.trim()) {
      const result = await validateCoupon(admin, couponCode, subtotal);
      if (!result.valid) {
        return json({ error: result.message }, 400);
      }
      discount = result.discountAmount;
      couponFields = {
        coupon_id: result.coupon.id,
        coupon_code: result.coupon.code,
        discount_type: result.coupon.discount_type,
        discount_value: result.coupon.discount_value,
      };
    }

    // Create the order as a draft: pending + unpaid. It only ever becomes
    // "paid" via the signature-verified webhook below, never from the
    // client. subtotal/total are placeholders here — the
    // recompute_order_total trigger overwrites both from the real
    // order_items rows inserted just below, using this `discount`.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        email: user.email,
        subtotal,
        discount,
        total: roundIDR(subtotal - discount),
        shipping_address: address,
        ...couponFields,
      })
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("Order creation failed.");

    const { error: itemsError } = await admin.from("order_items").insert(
      resolved.map((r) => ({
        order_id: order.id,
        product_id: r.productId,
        variant_id: r.variantId,
        product_name: r.productName,
        variant_label: r.variantLabel,
        quantity: r.quantity,
        unit_price: r.unitPrice,
      }))
    );
    if (itemsError) throw itemsError;

    // A discount is represented to Stripe as an ephemeral, one-time coupon
    // for the exact amount already computed above — not a percent_off
    // mirroring our own coupon, which would let Stripe's own rounding (and
    // ignorance of our max_discount cap) drift from what we actually
    // decided to charge. This keeps our validation the single source of
    // truth; Stripe just applies the number.
    // Despite having no real fractional subunit in everyday use, IDR is
    // NOT a zero-decimal currency in Stripe's API — confirmed live: sending
    // the raw Rupiah value as unit_amount made Stripe read Rp 49.250 as
    // Rp 492.50 (its own error message showed the decimal point), which
    // then fell under Stripe's minimum-charge threshold. unit_amount is in
    // the smallest unit the same as any 2-decimal currency, so it must be
    // multiplied by 100 here.
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (discount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(discount) * 100,
        currency: "idr",
        duration: "once",
        name: couponFields ? `Coupon ${couponFields.coupon_code}` : "Discount",
        metadata: { order_id: order.id },
      });
      discounts = [{ coupon: stripeCoupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: resolved.map((r) => ({
        quantity: r.quantity,
        price_data: {
          currency: "idr",
          unit_amount: Math.round(r.unitPrice) * 100,
          product_data: {
            name: r.productName,
            description: r.variantLabel,
            images: r.image ? [toAbsoluteUrl(r.image)] : undefined,
          },
        },
      })),
      discounts,
      metadata: { order_id: order.id },
      success_url: toAbsoluteUrl("/checkout/success?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: toAbsoluteUrl("/checkout/cancelled?session_id={CHECKOUT_SESSION_ID}"),
    });

    await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    return json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout-session]", err);
    return json({ error: "Something went wrong starting checkout. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
