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
}

export interface CartLine {
  productId: string;
  size: string;
  quantity: number;
}
