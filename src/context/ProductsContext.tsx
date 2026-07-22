import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "../types";
import { products as bundledProducts } from "../data/products";
import { fetchCatalog } from "../lib/catalog";

interface ProductsContextValue {
  products: Product[];
  /** 'database' once the live Supabase catalog has loaded */
  source: "bundled" | "database";
}

const ProductsContext = createContext<ProductsContextValue>({
  products: bundledProducts,
  source: "bundled",
});

/**
 * Renders instantly from the bundled catalog, then swaps to the live
 * Supabase catalog when it loads. If the database is unreachable the
 * bundled data simply stays in place.
 */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ProductsContextValue>({
    products: bundledProducts,
    source: "bundled",
  });

  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then((live) => {
      if (!cancelled && live) {
        // The storefront only ever shows published products; drafts and
        // archived pieces stay admin-only (RLS hides them from customers,
        // this filter hides them from signed-in admins browsing the store).
        const published = live.filter((p) => (p.status ?? "published") === "published");
        console.info(`[catalog] loaded ${published.length} products from Supabase`);
        setValue({ products: published, source: "database" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  return useContext(ProductsContext);
}
