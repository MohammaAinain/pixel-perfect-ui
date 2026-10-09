import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { listCategories, listProducts } from "@/lib/catalog.functions";

type ShopSearch = {
  category?: string | undefined;
  q?: string | undefined;
  sort?: "new" | "price-asc" | "price-desc" | "name" | undefined;
};

const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => listCategories(),
});

const productsQuery = (s: ShopSearch) =>
  queryOptions({
    queryKey: ["products", "list", s.category ?? "", s.q ?? "", s.sort ?? "new"],
    queryFn: () =>
      listProducts({
        data: {
          ...(s.category ? { category: s.category } : {}),
          ...(s.q ? { search: s.q } : {}),
          sort: s.sort ?? "new",
        },
      }),
  });

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search["category"] === "string" ? search["category"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    sort: ["new", "price-asc", "price-desc", "name"].includes(String(search["sort"]))
      ? (search["sort"] as ShopSearch["sort"])
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Menswear — AVENUE NEST CLOTHING" },
      {
        name: "description",
        content:
          "Browse every AVENUE NEST CLOTHING piece: shirts, t-shirts, oversized t-shirts, pants and jeans. Filter by category, search and sort by price.",
      },
      { property: "og:title", content: "Shop All Menswear — AVENUE NEST CLOTHING" },
      {
        property: "og:description",
        content: "Shirts, tees, oversized tees, pants and jeans in a strict monochrome palette.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(productsQuery(deps)),
    ]);
  },
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: products, isFetching } = useQuery(productsQuery(search));
  const [term, setTerm] = useState(search.q ?? "");

  function update(next: Partial<ShopSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...next }) });
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <p className="eyebrow">Collection</p>
        <h1 className="mt-3 text-4xl md:text-6xl">
          {categories.find((c) => c.slug === search.category)?.name ?? "All pieces"}
        </h1>

        <div className="mt-10 flex flex-col gap-5 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/shop"
              search={(prev) => ({ ...prev, category: undefined })}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
                !search.category ? "bg-ink text-background" : "bg-surface hover:bg-border"
              }`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={(prev) => ({ ...prev, category: c.slug })}
                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
                  search.category === c.slug
                    ? "bg-ink text-background"
                    : "bg-surface hover:bg-border"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>

          <div className="flex gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update({ q: term || undefined });
              }}
            >
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search"
                aria-label="Search products"
                className="h-10 w-44 border border-border bg-background px-3 text-sm outline-none focus:border-ink"
              />
            </form>
            <select
              value={search.sort ?? "new"}
              onChange={(e) => update({ sort: e.target.value as ShopSearch["sort"] })}
              aria-label="Sort products"
              className="h-10 border border-border bg-background px-3 text-sm outline-none focus:border-ink"
            >
              <option value="new">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {isFetching && !products && (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-surface" />
                <div className="mt-3 h-3 w-2/3 bg-surface" />
              </div>
            ))}
          </div>
        )}

        {products && products.length === 0 && (
          <div className="py-24 text-center">
            <h2 className="text-xl">Nothing here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another category or clear your search.
            </p>
          </div>
        )}

        {products && products.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
