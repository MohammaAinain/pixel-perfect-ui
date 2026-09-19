import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Modish Clothing — Monochrome Menswear" },
      {
        name: "description",
        content:
          "Modish Clothing makes small runs of monochrome menswear: strict palette, honest fabric, considered cuts. Here's how and why.",
      },
      { property: "og:title", content: "About Modish Clothing" },
      {
        property: "og:description",
        content: "Small runs of monochrome menswear, made with a strict palette and honest fabric.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-5 py-20 md:px-8">
        <p className="eyebrow">Our story</p>
        <h1 className="mt-4 text-4xl md:text-6xl">Fewer things, better made</h1>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
          <p>
            Modish Clothing started with a simple frustration: most menswear is either
            disposable or needlessly loud. We wanted a wardrobe that stayed quiet and still felt
            deliberate — black, white, charcoal, and nothing that fights for attention.
          </p>
          <p>
            Every piece begins with fabric. Heavyweight combed cotton for tees, washed linen and
            poplin for shirts, denim that earns its fades. We cut in small runs so we can obsess
            over fit, then restock only the pieces that deserve it.
          </p>
          <p>
            We keep things direct. No middlemen, no seasonal noise, no pressure to buy more than
            you need. Orders ship across India and you pay in cash when they arrive, so there's
            nothing to risk in trying us.
          </p>
        </div>
        <Link
          to="/shop"
          className="mt-12 inline-block bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background"
        >
          See the collection
        </Link>
      </div>
    </Layout>
  );
}
