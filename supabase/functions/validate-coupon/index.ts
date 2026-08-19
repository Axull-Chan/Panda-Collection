// Supabase Edge Function: validate-coupon
//
// Called by the checkout page's "Apply Coupon" button. Re-prices the cart
// server-side and validates the coupon against the database — never trusts
// a client-computed subtotal or discount. This is a preview only: nothing
// is charged or written here. create-checkout-session independently
// re-validates the coupon again at the moment an order is actually
// created, since time (and other customers' usage) can pass between a
// preview and an actual checkout.

import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveCartLines, type CartLine } from "../_shared/pricing.ts";
import { validateCoupon } from "../_shared/coupons.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A coupon code is a guessable secret — cap how many attempts one person
// can make in a window, the same way checkout session creation itself is
// capped, so this can't be used to brute-force-enumerate valid codes.
const VALIDATE_MAX_ATTEMPTS = 15;
const VALIDATE_WINDOW_SECONDS = 300;

interface RequestBody {
  code: string;
  lines: CartLine[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "You must be signed in to apply a coupon." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: withinLimit, error: rateLimitError } = await admin.rpc("check_rate_limit", {
      p_bucket: "coupon_validate",
      p_identifier: user.id,
      p_max_count: VALIDATE_MAX_ATTEMPTS,
      p_window_seconds: VALIDATE_WINDOW_SECONDS,
    });
    if (rateLimitError) throw rateLimitError;
    if (withinLimit === false) {
      return json({ error: "Too many attempts — please wait a few minutes and try again." }, 429);
    }

    const body = (await req.json()) as RequestBody;
    const code = body.code?.trim();
    if (!code) {
      return json({ error: "Please enter a coupon code." }, 400);
    }

    const pricing = await resolveCartLines(admin, body.lines);
    if (!pricing.ok) {
      return json({ error: pricing.error }, pricing.status);
    }

    const result = await validateCoupon(admin, code, pricing.subtotal);
    if (!result.valid) {
      return json({ valid: false, error: result.message });
    }

    return json({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.discount_type,
      discountValue: result.coupon.discount_value,
      discountAmount: result.discountAmount,
      subtotal: pricing.subtotal,
      total: roundIDR(pricing.subtotal - result.discountAmount),
    });
  } catch (err) {
    console.error("[validate-coupon]", err);
    return json({ error: "Something went wrong validating your coupon. Please try again." }, 500);
  }
});

// IDR has no subdivision — round to the nearest whole Rupiah, not cents.
function roundIDR(n: number): number {
  return Math.round(n);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
