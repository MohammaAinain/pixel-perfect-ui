import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Layout } from "@/components/site/Layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Fusion Fabric" },
      {
        name: "description",
        content:
          "Questions about sizing, an order or a return? Contact Fusion Fabric on WhatsApp or Instagram.",
      },
      { property: "og:title", content: "Contact Fusion Fabric" },
      { property: "og:description", content: "Reach Fusion Fabric on WhatsApp or Instagram about sizing, orders and returns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <Layout>
      <div className="mx-auto grid max-w-5xl gap-12 px-5 py-20 md:grid-cols-2 md:px-8">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1 className="mt-4 text-4xl md:text-5xl">Talk to us</h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Sizing advice, order updates and returns — message us on WhatsApp or Instagram.
          </p>
          <dl className="mt-10 space-y-5 text-sm">
            <div>
              <dt className="eyebrow">Support hours</dt>
              <dd className="mt-1">WhatsApp: <a className="underline" href="https://wa.me/917024293444" target="_blank" rel="noreferrer">+91 70242 93444</a></dd>
            </div>
            <div>
              <dt className="eyebrow">Orders</dt>
              <dd className="mt-1">Quote your order number for the fastest reply on either Instagram account.</dd>
            </div>
            <div>
              <dt className="eyebrow">Instagram</dt>
              <dd className="mt-1 flex flex-col items-start gap-2">
                <a className="underline" href="https://www.instagram.com/fusionfabric_clothing/" target="_blank" rel="noreferrer">@fusionfabric_clothing</a>
                <a className="underline" href="https://www.instagram.com/fusion_fabric_/" target="_blank" rel="noreferrer">@fusion_fabric_</a>
              </dd>
            </div>
          </dl>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.currentTarget.reset();
            toast.success("Message sent — we'll be in touch shortly");
          }}
          className="space-y-5"
        >
          <label className="block">
            <span className="eyebrow">Name</span>
            <input
              required
              className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Email</span>
            <input
              type="email"
              required
              className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Message</span>
            <textarea
              required
              rows={6}
              className="mt-2 w-full border border-border bg-background p-3 text-sm outline-none focus:border-ink"
            />
          </label>
          <button
            type="submit"
            className="w-full bg-ink px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background"
          >
            Send message
          </button>
        </form>
      </div>
    </Layout>
  );
}
