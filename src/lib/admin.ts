import { supabase } from "./supabase";

// ---------- types ----------

export type ProductStatus = "draft" | "published" | "archived";

export interface AdminImage {
  id: string;
  url: string;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface AdminVariant {
  id?: string;
  size: string;
  color: string;
  stock: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  sku: string | null;
  brand: string;
  badge: string | null;
  edition_size: number;
  release_index: number | null;
  featured: boolean;
  status: ProductStatus;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: string; slug: string; name: string } | null;
  product_images: AdminImage[];
  product_variants: (AdminVariant & { id: string })[];
  product_collections: { collection_id: string }[];
}

export interface Taxonomy {
  id: string;
  slug: string;
  name: string;
}

export interface AdminOrder {
  id: string;
  user_id: string | null;
  email: string | null;
  status: string;
  payment_status: string;
  shipping_status: string;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
  created_at: string;
  paid_at: string | null;
  stripe_session_id: string | null;
  order_items: {
    id: string;
    product_name: string;
    variant_label: string | null;
    quantity: number;
    unit_price: number;
  }[];
}

export interface CustomerProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

/** Low-stock threshold for a single size/colour variant. */
export const LOW_STOCK_VARIANT_THRESHOLD = 4;
/** Low-stock threshold for a product's total stock (summed across all its variants). */
export const LOW_STOCK_PRODUCT_THRESHOLD = 12;

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
] as const;

export const SHIPPING_STATUSES = ["not_shipped", "shipped", "delivered"] as const;

const PRODUCT_SELECT =
  "*, categories(id,slug,name), product_images(*), product_variants(*), product_collections(collection_id)";

// ---------- products ----------

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("release_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminProduct[];
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as AdminProduct;
}

export interface ProductInput {
  slug: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  sku: string | null;
  brand: string;
  badge: string | null;
  edition_size: number;
  release_index: number | null;
  featured: boolean;
  status: ProductStatus;
  category_id: string | null;
}

export async function saveProduct(input: ProductInput, id?: string): Promise<string> {
  if (id) {
    const { error } = await supabase.from("products").update(input).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supabase.from("products").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function setProductsStatus(ids: string[], status: ProductStatus) {
  const { error } = await supabase.from("products").update({ status }).in("id", ids);
  if (error) throw new Error(error.message);
}

export async function setProductFeatured(id: string, featured: boolean) {
  const { error } = await supabase.from("products").update({ featured }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProducts(ids: string[]) {
  const { error } = await supabase.from("products").delete().in("id", ids);
  if (error) throw new Error(error.message);
}

export async function duplicateProduct(product: AdminProduct): Promise<string> {
  const copySlug = `${product.slug}-copy-${Date.now().toString(36)}`;
  const newId = await saveProduct(
    {
      slug: copySlug,
      name: `${product.name} (Copy)`,
      description: product.description ?? "",
      price: product.price,
      sale_price: product.sale_price,
      sku: product.sku ? `${product.sku}-C` : null,
      brand: product.brand,
      badge: product.badge,
      edition_size: product.edition_size,
      release_index: product.release_index,
      featured: false,
      status: "draft",
      category_id: product.category_id,
    }
  );
  if (product.product_variants.length > 0) {
    await supabase.from("product_variants").insert(
      product.product_variants.map((v) => ({
        product_id: newId,
        size: v.size,
        color: v.color,
        stock: v.stock,
      }))
    );
  }
  if (product.product_images.length > 0) {
    await supabase.from("product_images").insert(
      product.product_images.map((img) => ({
        product_id: newId,
        url: img.url,
        alt: img.alt,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
      }))
    );
  }
  return newId;
}

// ---------- taxonomies ----------

export async function fetchTaxonomies(): Promise<{
  categories: Taxonomy[];
  collections: Taxonomy[];
}> {
  const [cats, cols] = await Promise.all([
    supabase.from("categories").select("id,slug,name").order("sort_order"),
    supabase.from("collections").select("id,slug,name").order("name"),
  ]);
  return {
    categories: (cats.data ?? []) as Taxonomy[],
    collections: (cols.data ?? []) as Taxonomy[],
  };
}

export async function setProductCollections(productId: string, collectionIds: string[]) {
  await supabase.from("product_collections").delete().eq("product_id", productId);
  if (collectionIds.length > 0) {
    const { error } = await supabase
      .from("product_collections")
      .insert(collectionIds.map((collection_id) => ({ product_id: productId, collection_id })));
    if (error) throw new Error(error.message);
  }
}

// ---------- variants ----------

export async function syncVariants(
  productId: string,
  variants: AdminVariant[],
  removedIds: string[]
) {
  if (removedIds.length > 0) {
    await supabase.from("product_variants").delete().in("id", removedIds);
  }
  for (const v of variants) {
    if (v.id) {
      const { error } = await supabase
        .from("product_variants")
        .update({ size: v.size, color: v.color, stock: v.stock })
        .eq("id", v.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("product_variants")
        .insert({ product_id: productId, size: v.size, color: v.color, stock: v.stock });
      if (error) throw new Error(error.message);
    }
  }
}

export async function updateVariantStock(variantId: string, stock: number) {
  const { error } = await supabase
    .from("product_variants")
    .update({ stock: Math.max(0, stock) })
    .eq("id", variantId);
  if (error) throw new Error(error.message);
}

// ---------- images ----------

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function uploadProductImage(productId: string, file: File): Promise<AdminImage> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: only JPEG, PNG, and WEBP are supported.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name}: images must be 8MB or smaller.`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url: pub.publicUrl,
      alt: file.name.replace(/\.[^.]+$/, ""),
      is_primary: (count ?? 0) === 0,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AdminImage;
}

export async function removeProductImage(image: AdminImage) {
  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  if (error) throw new Error(error.message);
  // Best-effort removal of the storage object for images we host
  const marker = "/product-images/";
  const idx = image.url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage
      .from("product-images")
      .remove([image.url.slice(idx + marker.length)]);
  }
}

export async function setPrimaryImage(productId: string, imageId: string) {
  await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .eq("is_primary", true);
  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);
  if (error) throw new Error(error.message);
}

export async function swapImageOrder(a: AdminImage, b: AdminImage) {
  await supabase.from("product_images").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("product_images").update({ sort_order: a.sort_order }).eq("id", b.id);
}

// ---------- orders ----------

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,user_id,email,status,payment_status,shipping_status,subtotal,discount,total," +
        "coupon_code,discount_type,discount_value,created_at," +
        "paid_at,stripe_session_id," +
        "order_items(id,product_name,variant_label,quantity,unit_price)"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminOrder[];
}

export async function updateOrder(
  id: string,
  fields: { status?: string; payment_status?: string; shipping_status?: string }
) {
  const { error } = await supabase.from("orders").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- customers ----------

export async function fetchCustomers(): Promise<CustomerProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,role,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerProfile[];
}

// ---------- dashboard stats ----------

export interface AdminStats {
  totalProducts: number;
  published: number;
  draft: number;
  archived: number;
  ordersToday: number;
  pendingOrders: number;
  lowStock: number;
  outOfStock: number;
  customers: number;
  revenuePaid: number;
  totalOrderValue: number;
}

async function countRows(table: string, filter?: (q: any) => any): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    published,
    draft,
    archived,
    ordersToday,
    pendingOrders,
    lowStock,
    outOfStock,
    customers,
    ordersTotals,
  ] = await Promise.all([
    countRows("products"),
    countRows("products", (q) => q.eq("status", "published")),
    countRows("products", (q) => q.eq("status", "draft")),
    countRows("products", (q) => q.eq("status", "archived")),
    countRows("orders", (q) => q.gte("created_at", todayStart.toISOString())),
    countRows("orders", (q) => q.eq("status", "pending")),
    countRows("product_variants", (q) =>
      q.gt("stock", 0).lte("stock", LOW_STOCK_VARIANT_THRESHOLD)
    ),
    countRows("product_variants", (q) => q.eq("stock", 0)),
    countRows("profiles"),
    supabase.from("orders").select("total,payment_status"),
  ]);

  const rows = (ordersTotals.data ?? []) as { total: number; payment_status: string }[];
  return {
    totalProducts,
    published,
    draft,
    archived,
    ordersToday,
    pendingOrders,
    lowStock,
    outOfStock,
    customers,
    revenuePaid: rows
      .filter((r) => r.payment_status === "paid")
      .reduce((s, r) => s + Number(r.total), 0),
    totalOrderValue: rows.reduce((s, r) => s + Number(r.total), 0),
  };
}
