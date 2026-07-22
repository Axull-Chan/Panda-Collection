import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Address } from "../context/AuthContext";
import type { CartLine, Product } from "../types";

/** Human-friendly order number derived from the order UUID. */
export function orderNumber(id: string) {
  return `AN-${id.slice(0, 8).toUpperCase()}`;
}

export interface OrderItemRecord {
  id: string;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  products: {
    slug: string;
    product_images: { url: string; is_primary: boolean }[];
  } | null;
}

export interface OrderRecord {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  subtotal: number;
  total: number;
  order_items: OrderItemRecord[];
}

const ORDER_SELECT =
  "id,created_at,status,payment_status,shipping_status,subtotal,total," +
  "order_items(id,product_name,variant_label,quantity,unit_price," +
  "products(slug,product_images(url,is_primary)))";

export async function fetchOrders(): Promise<OrderRecord[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[orders] fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderRecord[];
}

/** Looks up the order created for a given Stripe Checkout Session. */
export async function fetchOrderBySessionId(sessionId: string): Promise<OrderRecord | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.warn("[orders] session lookup failed:", error.message);
    return null;
  }
  return (data as unknown as OrderRecord) ?? null;
}

export async function createOrder(
  user: User,
  lines: CartLine[],
  products: Product[],
  address: Address
): Promise<{ orderId: string } | { error: string }> {
  // Client-side stock guard; the source of truth remains the database.
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants?.find((v) => v.size === line.size);
    if (variant && variant.stock < line.quantity) {
      return {
        error: `${product!.name} (Size ${line.size}) no longer has enough stock.`,
      };
    }
  }

  const items = lines.flatMap((line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product || !product.dbId) return [];
    const variant = product.variants?.find((v) => v.size === line.size);
    return [
      {
        product_id: product.dbId,
        variant_id: variant?.id ?? null,
        product_name: product.name,
        variant_label: variant ? `${variant.color} / ${variant.size}` : line.size,
        quantity: line.quantity,
        unit_price: product.price,
      },
    ];
  });

  if (items.length === 0) return { error: "Your cart is empty." };

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const { data: order, error: orderError } = await supabase
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

  if (orderError || !order) {
    return { error: orderError?.message ?? "Could not create the order." };
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));

  if (itemsError) return { error: itemsError.message };

  return { orderId: order.id as string };
}

export function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
