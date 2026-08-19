export type Category =
  | "COATS"
  | "KNITWEAR"
  | "SHIRTS"
  | "TROUSERS"
  | "DRESSES"
  | "TAILORING";

export type SortOption = "FEATURED" | "NEWEST" | "PRICE_LOW" | "PRICE_HIGH";

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
}

export interface ProductImage {
  url: string;
  /** Parsed from the image's alt text; null for shots not tied to one colour (group/detail shots). */
  color: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  sizes: string[];
  image: string;
  badge?: string;
  edition: number;
  releaseIndex: number;
  description: string;
  /** Database UUID — present when loaded from Supabase */
  dbId?: string;
  /** draft | published | archived — present when loaded from Supabase */
  status?: string;
  /** Size/colour variants with stock — present when loaded from Supabase */
  variants?: ProductVariant[];
  /** Full image gallery, tagged by colour where known — present when loaded from Supabase */
  images?: ProductImage[];
}

export interface CartLine {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}
