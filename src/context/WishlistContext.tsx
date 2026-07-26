import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import type { Product } from "../types";

interface WishlistContextValue {
  /** Product database UUIDs currently saved */
  ids: Set<string>;
  loading: boolean;
  has: (product: Product) => boolean;
  toggle: (product: Product) => Promise<string | null>;
  remove: (dbId: string) => Promise<string | null>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Single source of truth for the wishlist: every view (account section,
 * wishlist page, product page hearts) reads and writes through this
 * context, so they can never drift out of sync.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  // Once a toggle()/remove() has landed an optimistic update, this
  // baseline fetch is no longer the newest thing that's happened to `ids` —
  // it was issued before that write, so its response can arrive late and
  // otherwise overwrite the optimistic state with pre-write data.
  const mutatedRef = useRef(false);

  useEffect(() => {
    mutatedRef.current = false;
    if (!user) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("wishlist_items")
      .select("product_id")
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          if (error) console.warn("[wishlist] fetch failed:", error.message);
          if (!mutatedRef.current) {
            setIds(new Set((data ?? []).map((r) => r.product_id as string)));
          }
          setLoading(false);
        },
        (err: Error) => {
          if (cancelled) return;
          console.warn("[wishlist] fetch failed:", err.message);
          setLoading(false);
        }
      );
    return () => {
      cancelled = true;
    };
    // Supabase's onAuthStateChange hands back a fresh `user` object on
    // events that don't change who's signed in (e.g. TOKEN_REFRESHED) — keying
    // off the object would re-run this fetch and clobber an in-flight
    // optimistic toggle() update with stale pre-write data. user.id is
    // stable across those events, so it's the correct dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const has = useCallback(
    (product: Product) => (product.dbId ? ids.has(product.dbId) : false),
    [ids]
  );

  const remove = useCallback(
    async (dbId: string) => {
      if (!user) return "Not signed in.";
      mutatedRef.current = true;
      setIds((prev) => {
        const next = new Set(prev);
        next.delete(dbId);
        return next;
      });
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", dbId);
      if (error) {
        setIds((prev) => new Set(prev).add(dbId));
        return error.message;
      }
      return null;
    },
    [user]
  );

  const toggle = useCallback(
    async (product: Product) => {
      if (!user) return "Not signed in.";
      if (!product.dbId) return "This product is not available right now.";
      if (ids.has(product.dbId)) return remove(product.dbId);

      const dbId = product.dbId;
      mutatedRef.current = true;
      setIds((prev) => new Set(prev).add(dbId));
      const { error } = await supabase
        .from("wishlist_items")
        .insert({ user_id: user.id, product_id: dbId });
      if (error && error.code !== "23505") {
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(dbId);
          return next;
        });
        return error.message;
      }
      return null;
    },
    [user, ids, remove]
  );

  return (
    <WishlistContext.Provider value={{ ids, loading, has, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
