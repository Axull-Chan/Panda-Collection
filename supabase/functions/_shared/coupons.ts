// Shared server-side coupon validation + discount computation, used by both
// validate-coupon (the checkout page's live "Apply Coupon" preview) and
// create-checkout-session (the actual, authoritative application at payment
// time). This is the only place a discount amount is ever computed — a
// client-sent discount is never trusted.
//
// Coupon codes are matched case-insensitively by comparing the trimmed,
// upper-cased input against the stored (always upper-cased at write time —
// see lib/coupons.ts) code with a plain equality check, not `ilike`, so a
// code containing `%`/`_` can't be misread as a wildcard pattern.

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
}

export type CouponValidation =
  | { valid: true; coupon: CouponRow; discountAmount: number }
  | {
      valid: false;
      reason: "not_found" | "inactive" | "not_started" | "expired" | "usage_limit" | "min_order";
      message: string;
    };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// deno-lint-ignore no-explicit-any
export async function validateCoupon(
  admin: any,
  code: string,
  subtotal: number
): Promise<CouponValidation> {
  const normalizedCode = code.trim().toUpperCase();
  const { data, error } = await admin
    .from("coupons")
    .select(
      "id,code,description,discount_type,discount_value,min_order,max_discount," +
        "starts_at,expires_at,max_uses,used_count,active"
    )
    .eq("code", normalizedCode)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    return { valid: false, reason: "not_found", message: "This coupon code doesn't exist." };
  }
  const coupon: CouponRow = {
    ...data,
    discount_value: Number(data.discount_value),
    min_order: Number(data.min_order),
    max_discount: data.max_discount == null ? null : Number(data.max_discount),
    max_uses: data.max_uses == null ? null : Number(data.max_uses),
    used_count: Number(data.used_count),
  };

  if (!coupon.active) {
    return { valid: false, reason: "inactive", message: "This coupon is no longer active." };
  }
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { valid: false, reason: "not_started", message: "This coupon isn't active yet." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    return { valid: false, reason: "expired", message: "This coupon has expired." };
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return {
      valid: false,
      reason: "usage_limit",
      message: "This coupon has reached its usage limit.",
    };
  }
  if (subtotal < coupon.min_order) {
    return {
      valid: false,
      reason: "min_order",
      message: `This coupon requires a minimum purchase of $${coupon.min_order.toFixed(2)}.`,
    };
  }

  let discountAmount =
    coupon.discount_type === "percent"
      ? subtotal * (coupon.discount_value / 100)
      : coupon.discount_value;
  if (coupon.max_discount != null) discountAmount = Math.min(discountAmount, coupon.max_discount);
  // Never discount more than the cart is worth — keeps total from going negative.
  discountAmount = round2(Math.max(0, Math.min(discountAmount, subtotal)));

  return { valid: true, coupon, discountAmount };
}
