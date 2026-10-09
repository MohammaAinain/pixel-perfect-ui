import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { useCart } from "@/lib/cart";
import { FREE_SHIPPING_THRESHOLD, formatINR } from "@/lib/shop";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag — AVENUE NEST CLOTHING" },
      {
        name: "description",
        content: "Review the pieces in your AVENUE NEST CLOTHING bag before checking out with cash on delivery.",
      },
      { property: "og:title", content: "Your Bag — AVENUE NEST CLOTHING" },
      { property: "og:description", content: "Review your bag and check out with cash on delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQuantity, remove, subtotal, shipping, total, ready } = useCart();

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <h1 className="text-4xl md:text-5xl">Your bag</h1>

        {!ready ? null : lines.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm text-muted-foreground">Your bag is empty.</p>
            <Link
              to="/shop"
              className="mt-6 inline-block bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px]">
            <ul className="divide-y divide-border border-y border-border">
              {lines.map((l) => (
                <li key={`${l.productId}-${l.size ?? ""}`} className="flex gap-4 py-6">
                  <Link
                    to="/product/$slug"
                    params={{ slug: l.slug }}
                    className="size-24 shrink-0 overflow-hidden bg-surface"
                  >
                    {l.image && (
                      <img src={l.image} alt={l.name} loading="lazy" className="size-full object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link to="/product/$slug" params={{ slug: l.slug }} className="text-sm font-semibold">
                          {l.name}
                        </Link>
                        {l.size && (
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            Size {l.size}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold">{formatINR(l.price * l.quantity)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-border">
                        <button
                          className="px-3 py-2 text-sm"
                          onClick={() => setQuantity(l.productId, l.size, l.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          –
                        </button>
                        <span className="w-8 text-center text-sm">{l.quantity}</span>
                        <button
                          className="px-3 py-2 text-sm"
                          onClick={() => setQuantity(l.productId, l.size, l.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => remove(l.productId, l.size)}
                        aria-label={`Remove ${l.name}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit bg-surface p-6">
              <h2 className="text-lg">Summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatINR(total)}</dd>
                </div>
              </dl>
              {subtotal < FREE_SHIPPING_THRESHOLD && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Add {formatINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
                </p>
              )}
              <Link
                to="/checkout"
                className="mt-6 block bg-ink px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-background"
              >
                Checkout
              </Link>
              <p className="mt-3 text-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Cash on delivery only
              </p>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
