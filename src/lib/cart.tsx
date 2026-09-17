import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { shippingFor } from "./shop";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  size: string | null;
  quantity: number;
  image: string | null;
  maxStock: number;
};

type CartContextValue = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQuantity: (productId: string, size: string | null, quantity: number) => void;
  remove: (productId: string, size: string | null) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  ready: boolean;
};

const STORAGE_KEY = "modish-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

const same = (l: CartLine, id: string, size: string | null) =>
  l.productId === id && (l.size ?? "") === (size ?? "");

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore malformed cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => same(l, line.productId, line.size));
      if (existing) {
        return prev.map((l) =>
          same(l, line.productId, line.size)
            ? { ...l, quantity: Math.min(l.quantity + line.quantity, l.maxStock || 20) }
            : l,
        );
      }
      return [...prev, line];
    });
  }, []);

  const setQuantity = useCallback((productId: string, size: string | null, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          same(l, productId, size)
            ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxStock || 20)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((productId: string, size: string | null) => {
    setLines((prev) => prev.filter((l) => !same(l, productId, size)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const shipping = shippingFor(subtotal);
    return {
      lines,
      add,
      setQuantity,
      remove,
      clear,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      ready,
    };
  }, [lines, add, setQuantity, remove, clear, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
