import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "../types";
import { useProducts } from "./ProductsContext";

const STORAGE_KEY = "acd-cart";

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  addToCart: (productId: string, size: string, color: string) => void;
  removeLine: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [lines, setLines] = useState<CartLine[]>(loadLines);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage unavailable (private mode etc.) — cart stays in memory.
    }
  }, [lines]);

  const addToCart = (productId: string, size: string, color: string) => {
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.productId === productId && l.size === size && l.color === color
      );
      if (existing) {
        return prev.map((l) =>
          l.productId === productId && l.size === size && l.color === color
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [...prev, { productId, size, color, quantity: 1 }];
    });
  };

  const removeLine = (productId: string, size: string, color: string) => {
    setLines((prev) =>
      prev.filter((l) => !(l.productId === productId && l.size === size && l.color === color))
    );
  };

  const updateQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeLine(productId, size, color);
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId && l.size === size && l.color === color
          ? { ...l, quantity }
          : l
      )
    );
  };

  const clearCart = () => setLines([]);

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const product = products.find((p) => p.id === l.productId);
        return sum + (product ? product.price * l.quantity : 0);
      }, 0),
    [lines, products]
  );

  const value: CartContextValue = {
    lines,
    itemCount,
    addToCart,
    removeLine,
    updateQuantity,
    clearCart,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
