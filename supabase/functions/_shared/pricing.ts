// Shared server-side cart re-pricing, used by both create-checkout-session
// and validate-coupon. Client-sent prices/quantities/availability are never
// trusted — everything here is read fresh from the database.

export interface CartLine {
  productId: string; // product slug
  size: string;
  quantity: number;
}

export interface ResolvedLine {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  /** Raw (possibly relative) image URL — callers absolutize it themselves if needed. */
  image: string | null;
}

export type PricingResult =
  | { ok: true; resolved: ResolvedLine[]; subtotal: number }
  | { ok: false; error: string; status: number };

// deno-lint-ignore no-explicit-any
export async function resolveCartLines(admin: any, lines: CartLine[]): Promise<PricingResult> {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, error: "Your cart is empty.", status: 400 };
  }

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

  const resolved: ResolvedLine[] = [];

  for (const line of lines) {
    // deno-lint-ignore no-explicit-any
    const product = products?.find((p: any) => p.slug === line.productId);
    if (!product || product.status !== "published") {
      return { ok: false, error: "A product in your cart is no longer available.", status: 409 };
    }
    // deno-lint-ignore no-explicit-any
    const variant = product.product_variants.find((v: any) => v.size === line.size);
    if (!variant) {
      return {
        ok: false,
        error: `${product.name} is no longer available in size ${line.size}.`,
        status: 409,
      };
    }
    if (variant.stock < line.quantity) {
      return {
        ok: false,
        error:
          variant.stock === 0
            ? `${product.name} (Size ${line.size}) just sold out.`
            : `Only ${variant.stock} left of ${product.name} (Size ${line.size}).`,
        status: 409,
      };
    }
    const primary =
      // deno-lint-ignore no-explicit-any
      product.product_images.find((i: any) => i.is_primary) ??
      // deno-lint-ignore no-explicit-any
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
  return { ok: true, resolved, subtotal };
}
