import { supabase } from "./supabase";

export type DiscountType = "percent" | "fixed";

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  created_at: string;
}

export interface CouponInput {
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  active: boolean;
}

const COUPON_SELECT =
  "id,code,description,discount_type,discount_value,min_order,max_discount," +
  "starts_at,expires_at,max_uses,used_count,active,created_at";

export async function fetchAdminCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminCoupon[];
}

export async function fetchAdminCoupon(id: string): Promise<AdminCoupon> {
  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as AdminCoupon;
}

/** Codes are always stored upper-cased — this is what the checkout-side
 *  validation (supabase/functions/_shared/coupons.ts) matches against. */
export async function saveCoupon(input: CouponInput, id?: string): Promise<string> {
  const payload = { ...input, code: input.code.trim().toUpperCase() };
  if (id) {
    const { error } = await supabase.from("coupons").update(payload).eq("id", id);
    if (error) throw new Error(friendlyCouponError(error));
    return id;
  }
  const { data, error } = await supabase.from("coupons").insert(payload).select("id").single();
  if (error) throw new Error(friendlyCouponError(error));
  return data.id as string;
}

export async function setCouponActive(id: string, active: boolean) {
  const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function friendlyCouponError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "A coupon with this code already exists.";
  return error.message;
}
