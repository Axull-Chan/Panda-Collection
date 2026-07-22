// Supabase Edge Function: create-checkout-session
//
// Called by the authenticated storefront at checkout. Never trusts prices,
// stock, or totals sent by the browser — everything is re-read from the
// database here, server-side, before an order or a Stripe session is ever
// created. This closes the "tampered client" gap a pure client-side
// checkout would have.
//
// Flow: verify the caller's session -> re-price the cart from Postgres ->
// check real stock -> create the order + order_items (status: pending,
// payment_status: unpaid) -> create a Stripe Checkout Session mirroring
// those items -> store the session id on the order -> return the Stripe
// URL for the browser to redirect to.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { corsHeaders } from "../_shared/cors.ts";

interface CartLine {
  productId: string; // product slug
  size: string;
  quantity: number;
}

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

    const body = (await req.json()) as RequestBody;
    const { lines, address } = body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return json({ error: "Your cart is empty." }, 400);
    }
    if (!address?.line1 || !address?.city || !address?.postal_code || !address?.country) {
      return json({ error: "Please provide a complete shipping address." }, 400);
    }

    // Re-price everything from the database. Client-sent prices are ignored.
    const slugs = [...new Set(lines.map((l) => l.productId))];
    const { data: products, error: productsError } = await admin
      .from("products")
      .select(
        "id,slug,name,price,sale_price,status," +
          "product_images(url,is_primary,sort_order)," +
          "product_variants(id,size,color,stock)"
      )
      .in("slug", slugs);
    if (productsError) throw productsError;

    type ResolvedLine = {
      variantId: string;
      productId: string;
      productName: string;
      variantLabel: string;
      quantity: number;
      unitPrice: number;
      image: string | null;
    };
    const resolved: ResolvedLine[] = [];

    for (const line of lines) {
      const product = products?.find((p) => p.slug === line.productId);
      if (!product || product.status !== "published") {
        return json({ error: `A product in your cart is no longer available.` }, 409);
      }
      const variant = product.product_variants.find((v: any) => v.size === line.size);
      if (!variant) {
        return json(
          { error: `${product.name} is no longer available in size ${line.size}.` },
          409
        );
      }
      if (variant.stock < line.quantity) {
        return json(
          {
            error:
              variant.stock === 0
                ? `${product.name} (Size ${line.size}) just sold out.`
                : `Only ${variant.stock} left of ${product.name} (Size ${line.size}).`,
          },
          409
        );
      }
      const primary =
        product.product_images.find((i: any) => i.is_primary) ??
        [...product.product_images].sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
      resolved.push({
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantLabel: `${variant.color} / ${variant.size}`,
        quantity: line.quantity,
        unitPrice: Number(product.sale_price ?? product.price),
        image: primary?.url ?? null,
      });
    }

    const subtotal = resolved.reduce((sum, r) => sum + r.unitPrice * r.quantity, 0);

    // Create the order as a draft: pending + unpaid. It only ever becomes
    // "paid" via the signature-verified webhook below, never from the client.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        email: user.email,
        subtotal,
        discount: 0,
        total: subtotal,
        shipping_address: address,
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

    const stripe = new Stripe(stripeSecretKey);
    const origin = req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: resolved.map((r) => ({
        quantity: r.quantity,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(r.unitPrice * 100),
          product_data: {
            name: r.productName,
            description: r.variantLabel,
            images: r.image ? [r.image] : undefined,
          },
        },
      })),
      metadata: { order_id: order.id },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancelled?session_id={CHECKOUT_SESSION_ID}`,
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
