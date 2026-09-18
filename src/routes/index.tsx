import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { listCategories, listProducts } from "@/lib/catalog.functions";
import heroAsset from "@/assets/mc-hero.jpg.asset.json";

const featuredQuery = queryOptions({
  queryKey: ["products", "featured"],
  queryFn: () => listProducts({ data: { flag: "featured", limit: 8 } }),
});
const newQuery = queryOptions({
  queryKey: ["products", "new"],
  queryFn: () => listProducts({ data: { flag: "new_arrival", limit: 4 } }),
});
const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => listCategories(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Modish Clothing — Premium Menswear, Cash on Delivery" },
      {
        name: "description",
        content:
          "Monochrome menswear built to last: shirts, tees, oversized tees, pants and jeans. Free shipping over ₹1000, cash on delivery across India.",
      },
      { property: "og:title", content: "Modish Clothing — Premium Menswear" },
      {
        property: "og:description",
        content: "Considered monochrome menswear. Free shipping over ₹1000, cash on delivery.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(featuredQuery),
      context.queryClient.ensureQueryData(newQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: featured } = useSuspenseQuery(featuredQuery);
  const { data: arrivals } = useSuspenseQuery(newQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);

  return (
    <Layout>
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-stretch gap-0 px-0 md:grid-cols-2">
          <div className="fade-up flex flex-col justify-center px-5 py-16 md:px-8 md:py-28">
            <p className="eyebrow">Autumn Edit — 2026</p>
            <h1 className="display-xl mt-5">
              Dressed
              <br />
              in shadow
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              A strict black, white and charcoal wardrobe for men who prefer fewer, better
              pieces. Cut clean, finished properly, delivered to your door.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-85"
              >
                Shop the edit
              </Link>
              <Link
                to="/about"
                className="border border-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-background"
              >
                Our story
              </Link>
            </div>
          </div>
          <div className="relative min-h-[420px] bg-surface md:min-h-[640px]">
            <img
              src={heroAsset.url}
              alt="Model wearing a black oversized shirt and charcoal trousers"
              width={1408}
              height={1600}
              className="size-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl">Categories</h2>
          <Link to="/shop" className="text-xs font-bold uppercase tracking-[0.18em]">
            View all
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="group relative aspect-[3/4] overflow-hidden bg-surface"
            >
              {c.image && (
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-background">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl md:text-3xl">Featured</h2>
            <Link to="/shop" className="text-xs font-bold uppercase tracking-[0.18em]">
              Shop all
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 bg-ink py-16 text-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-3 md:px-8">
          {[
            ["Free shipping over ₹1000", "Flat ₹100 below that. No surprises at checkout."],
            ["Cash on delivery", "Pay in cash when your order reaches your door."],
            ["Made in small runs", "Limited quantities, restocked only when they earn it."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-base">{title}</h3>
              <p className="mt-2 text-sm text-background/60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {arrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <h2 className="text-2xl md:text-3xl">New arrivals</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {arrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
