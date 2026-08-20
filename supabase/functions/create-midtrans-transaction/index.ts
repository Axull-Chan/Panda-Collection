// Supabase Edge Function: create-midtrans-transaction
//
// Midtrans counterpart to create-checkout-session — same trust model:
// never trusts prices, stock, discounts, or totals sent by the browser,
// everything is re-read from the database here before an order or a
// Midtrans transaction is ever created.
//
// Flow: verify the caller's session -> re-price the cart from Postgres ->
// check real stock -> independently re-validate any coupon code against
// the current subtotal -> create the order + order_items (status: pending,
// payment_status: unpaid, payment_provider: midtrans) -> create a Midtrans
// Snap transaction mirroring those items -> store the redirect URL on the
// order -> return it for the browser to redirect to.
//
// Midtrans's own order_id is set to this order's id directly (a UUID fits
// Midtrans's "alphanumeric, dash, underscore, tilde, dot, max 50 chars"
// constraint), so no separate identifier needs to be generated or stored —
// the primary key doubles as the cross-reference the notification webhook
// uses to find this order again.

import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveCartLines, type CartLine } from "../_shared/pricing.ts";
import { validateCoupon } from "../_shared/coupons.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Same dedupe/rate-limit shape as create-checkout-session, and — deliberately
// — the same "checkout" rate-limit bucket, so switching payment providers
// can't be used to dodge the limit.
const CHECKOUT_DEDUPE_WINDOW_MS = 10_000;
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
  couponCode?: string;
  origin: string;
}

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
    const midtransServerKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!midtransServerKey) {
      throw new Error("MIDTRANS_SERVER_KEY is not configured on this function.");
    }
    // Sandbox and production have separate hosts entirely (not a query
    // param or header switch) — driven by an explicit flag rather than
    // sniffed from the key's shape, which isn't a documented contract.
    const isProduction = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";
    const snapApiBase = isProduction
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";

    const authHeader = req.headers.get("Authorization") ?? "";

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

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // A double-click, a rapid refresh, or two open tabs shouldn't spawn a
    // second draft order — reuse a just-created Midtrans redirect URL
    // rather than calling Midtrans again. Unlike Stripe's session.retrieve,
    // there's no cheap single-call "is this still open" check here, so this
    // simply trusts the stored URL within the short window (Midtrans's
    // redirect URLs are valid 24h by default; this window is 10s).
    const { data: recentOrder } = await admin
      .from("orders")
      .select("midtrans_redirect_url, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .not("midtrans_redirect_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recentOrder?.midtrans_redirect_url &&
      Date.now() - new Date(recentOrder.created_at).getTime() < CHECKOUT_DEDUPE_WINDOW_MS
    ) {
      return json({ url: recentOrder.midtrans_redirect_url });
    }

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

    if (!address?.line1 || !address?.city || !address?.postal_code || !address?.country) {
      return json({ error: "Please provide a complete shipping address." }, 400);
    }

    // Re-price everything from the database. Client-sent prices are ignored.
    const pricing = await resolveCartLines(admin, lines);
    if (!pricing.ok) {
      return json({ error: pricing.error }, pricing.status);
    }
    const { resolved, subtotal } = pricing;

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

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        email: user.email,
        subtotal,
        discount,
        total: roundIDR(subtotal - discount),
        shipping_address: address,
        payment_provider: "midtrans",
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

    // Midtrans has no equivalent of Stripe's ephemeral-coupon object — the
    // discount is represented as a plain negative line item instead, so the
    // item_details sum matches gross_amount exactly and the customer sees
    // the discount itemized on Midtrans's own payment page.
    const itemDetails = resolved.map((r) => ({
      id: r.variantId,
      price: Math.round(r.unitPrice),
      quantity: r.quantity,
      name: r.productName.slice(0, 50),
    }));
    if (discount > 0) {
      itemDetails.push({
        id: "discount",
        price: -Math.round(discount),
        quantity: 1,
        name: couponFields ? `Coupon ${couponFields.coupon_code}`.slice(0, 50) : "Discount",
      });
    }

    const grossAmount = roundIDR(subtotal - discount);
    const [firstName] = (user.email ?? "Customer").split("@");

    const midtransResponse = await fetch(`${snapApiBase}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${midtransServerKey}:`)}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: order.id, gross_amount: grossAmount },
        customer_details: { first_name: firstName, email: user.email },
        item_details: itemDetails,
      }),
    });

    if (!midtransResponse.ok) {
      const errorBody = await midtransResponse.text();
      console.error("[create-midtrans-transaction] Midtrans API error", errorBody);
      throw new Error(`Midtrans transaction creation failed (${midtransResponse.status})`);
    }

    const { redirect_url: redirectUrl } = (await midtransResponse.json()) as {
      redirect_url: string;
    };

    await admin.from("orders").update({ midtrans_redirect_url: redirectUrl }).eq("id", order.id);

    return json({ url: redirectUrl });
  } catch (err) {
    console.error("[create-midtrans-transaction]", err);
    return json({ error: "Something went wrong starting checkout. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
