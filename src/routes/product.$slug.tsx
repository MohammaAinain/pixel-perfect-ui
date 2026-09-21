import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/site/Layout";
import { getProductBySlug } from "@/lib/catalog.functions";
import { effectivePrice, formatINR } from "@/lib/shop";
import { useCart } from "@/lib/cart";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!product) throw notFound();
    return { name: product.name, description: product.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Product"} — AVENUE NEST CLOTHING` },
      {
        name: "description",
        content:
          loaderData?.description?.slice(0, 155) ??
          "A considered monochrome menswear piece from AVENUE NEST CLOTHING.",
      },
      { property: "og:title", content: `${loaderData?.name ?? "Product"} — AVENUE NEST CLOTHING` },
      {
        property: "og:description",
        content:
          loaderData?.description?.slice(0, 155) ?? "Premium menswear from AVENUE NEST CLOTHING.",
      },
    ],
  }),
  component: ProductPage,
  errorComponent: () => (
    <Layout>
      <div className="py-32 text-center">
        <h1 className="text-2xl">This piece didn't load</h1>
        <Link to="/shop" className="mt-4 inline-block text-sm underline">
          Back to shop
        </Link>
      </div>
    </Layout>
  ),
  notFoundComponent: () => (
    <Layout>
      <div className="py-32 text-center">
        <h1 className="text-2xl">Piece not found</h1>
        <Link to="/shop" className="mt-4 inline-block text-sm underline">
          Back to shop
        </Link>
      </div>
    </Layout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(slug));
  const { add } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const price = effectivePrice(product);
  const onSale = product.sale_price !== null && product.sale_price < product.price;
  const soldOut = product.stock <= 0;

  function addToCart() {
    if (!product) return;
    if (product.sizes.length > 0 && !size) {
      toast.error("Choose a size first");
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price,
      size,
      quantity: qty,
      image: product.images[0] ?? null,
      maxStock: product.stock,
    });
    toast.success(`${product.name} added to bag`);
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <nav className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Link to="/shop">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="aspect-[4/5] overflow-hidden bg-surface">
              {product.images[active] ? (
                <img
                  src={product.images[active]}
                  alt={product.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActive(i)}
                    className={`size-20 overflow-hidden border ${
                      i === active ? "border-ink" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:pl-6">
            <p className="eyebrow">{product.category?.name}</p>
            <h1 className="mt-3 text-3xl md:text-5xl">{product.name}</h1>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-2xl font-bold">{formatINR(price)}</span>
              {onSale && (
                <>
                  <span className="text-base text-muted-foreground line-through">
                    {formatINR(product.price)}
                  </span>
                  <span className="bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
                    {product.discount_percent}% off
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            {product.sizes.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow">Size</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-14 border px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                        size === s
                          ? "border-ink bg-ink text-background"
                          : "border-border hover:border-ink"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border border-border">
                <button
                  className="px-4 py-3 text-sm"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  –
                </button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <button
                  className="px-4 py-3 text-sm"
                  onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {soldOut
                  ? "Out of stock"
                  : product.stock <= 5
                    ? `Only ${product.stock} left`
                    : "In stock"}
              </span>
            </div>

            <button
              disabled={soldOut}
              onClick={addToCart}
              className="mt-8 w-full bg-ink px-8 py-5 text-xs font-bold uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {soldOut ? "Sold out" : "Add to bag"}
            </button>

            <dl className="mt-8 space-y-2 border-t border-border pt-6 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <div className="flex justify-between">
                <dt>SKU</dt>
                <dd className="text-foreground">{product.sku ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Payment</dt>
                <dd className="text-foreground">Cash on delivery</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="text-foreground">Free over ₹1000</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Layout>
  );
}
