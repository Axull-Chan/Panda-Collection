import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "../types";
import { fetchCatalog } from "../lib/catalog";

interface ProductsContextValue {
  products: Product[];
  /** 'database' once the live Supabase catalog has loaded */
  source: "loading" | "database";
}

const ProductsContext = createContext<ProductsContextValue>({
  products: [],
  source: "loading",
});

/**
 * Starts empty and swaps to the live Supabase catalog once it loads.
 * Deliberately no bundled placeholder data: a fake catalog flashing on
 * screen (or lingering forever on a real outage) misrepresents what's
 * actually for sale, same reasoning as the honest "no photo" placeholder
 * used elsewhere in the catalog.
 */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ProductsContextValue>({
    products: [],
    source: "loading",
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
