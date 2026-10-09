import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { listCategories, listProducts } from "@/lib/catalog.functions";
import campaignBanner from "@/assets/avenue-nest-campaign-banner.jpg";

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
      { title: "AVENUE NEST CLOTHING — Premium Menswear, Cash on Delivery" },
      {
        name: "description",
        content:
          "Monochrome menswear built to last: shirts, tees, oversized tees, pants and jeans. Free shipping over ₹1000, cash on delivery across India.",
      },
      { property: "og:title", content: "AVENUE NEST CLOTHING — Premium Menswear" },
      {
        property: "og:description",
        content: "Considered monochrome menswear. Free shipping over ₹1000, cash on delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      <section className="mx-auto max-w-7xl md:px-8">
        <div className="relative aspect-[4/5] min-h-[500px] overflow-hidden bg-ink md:aspect-[1.95] md:min-h-[500px]">
          <img
            src={campaignBanner}
            alt="Model in a black layered outfit on a city street"
            width={1920}
            height={1024}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[72%_center] md:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/30 to-transparent" />
          <div className="relative z-10 flex min-h-[500px] items-end px-5 py-12 md:items-center md:px-12 md:py-16">
            <div className="fade-up max-w-xl">
              <p className="eyebrow text-background/75">Autumn Edit — 2026</p>
              <h1 className="mt-5 text-5xl font-black uppercase leading-[0.92] tracking-normal text-background md:text-7xl">
                Dressed
                <br />
                in shadow
              </h1>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-background/80 md:text-base">
                A strict black, white and charcoal wardrobe for men who prefer fewer, better
                pieces. Cut clean, finished properly, delivered to your door.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/shop"
                  className="bg-background px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-85"
                >
                  Shop the edit
                </Link>
                <Link
                  to="/about"
                  className="border border-background px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  Our story
                </Link>
              </div>
            </div>
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
