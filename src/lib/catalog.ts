import { supabase } from "./supabase";
import type { Category, Product } from "../types";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL"];

interface CategoryRow {
  slug: string;
}

interface ProductRow {
  id: string;
  status?: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  badge: string | null;
  edition_size: number;
  release_index: number | null;
  categories: CategoryRow | CategoryRow[] | null;
  product_images: { url: string; alt: string | null; is_primary: boolean; sort_order: number }[];
  product_variants: { id: string; size: string; color: string; stock: number }[];
}

/**
 * Loads the live catalog from Supabase and maps it onto the Product shape
 * the UI already uses. Returns null when the database isn't reachable or
 * has no products, so callers can keep the bundled fallback catalog.
 */
const CATALOG_SELECT =
  "id,slug,name,description,price,sale_price,badge,edition_size,release_index," +
  "categories(slug)," +
  "product_images(url,alt,is_primary,sort_order)," +
  "product_variants(id,size,color,stock)";

export async function fetchCatalog(): Promise<Product[] | null> {
  // `status` doesn't exist until migration 005 runs — retry without it so
  // older databases keep working.
  let res = await supabase
    .from("products")
    .select(`${CATALOG_SELECT},status`)
    .order("release_index");
  if (res.error) {
    res = (await supabase
      .from("products")
      .select(CATALOG_SELECT)
      .order("release_index")) as unknown as typeof res;
  }

  const { data, error } = res;
  if (error || !data || data.length === 0) {
    if (error) console.warn("[catalog] falling back to bundled data:", error.message);
    return null;
  }

  return (data as unknown as ProductRow[]).map(mapRow);
}

/** Loads a single product regardless of status — RLS restricts drafts/archived to admins. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  let res = await supabase
    .from("products")
    .select(`${CATALOG_SELECT},status`)
    .eq("slug", slug)
    .maybeSingle();
  if (res.error) {
    res = (await supabase
      .from("products")
      .select(CATALOG_SELECT)
      .eq("slug", slug)
      .maybeSingle()) as unknown as typeof res;
  }
  if (res.error || !res.data) return null;
  return mapRow(res.data as unknown as ProductRow);
}

// Migration-authored alt text encodes colour as "<name> - <colour>"; images
// without that suffix (group/detail shots) are left uncoloured and only
// ever appear in the full gallery, never picked for a colour swap.
function colorFromAlt(alt: string | null): string | null {
  if (!alt || !alt.includes(" - ")) return null;
  return alt.slice(alt.lastIndexOf(" - ") + 3);
}

function mapRow(row: ProductRow): Product {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const sortedImages = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);
  const primary = row.product_images.find((i) => i.is_primary) ?? sortedImages[0];
  const sizes = [...new Set(row.product_variants.map((v) => v.size))].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  );

  return {
    id: row.slug,
    name: row.name,
    price: Number(row.sale_price ?? row.price),
    category: (category?.slug ?? "coats").toUpperCase() as Category,
    sizes,
    image: primary?.url ?? "",
    badge: row.badge ?? undefined,
    edition: row.edition_size,
    releaseIndex: row.release_index ?? 0,
    description: row.description ?? "",
    dbId: row.id,
    status: row.status ?? "published",
    variants: row.product_variants,
    images: sortedImages.map((i) => ({
      url: i.url,
      color: colorFromAlt(i.alt),
      isPrimary: i.is_primary,
      sortOrder: i.sort_order,
    })),
  };
}
