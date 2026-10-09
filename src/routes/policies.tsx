import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Shipping, Returns & Privacy — AVENUE NEST CLOTHING" },
      {
        name: "description",
        content:
          "AVENUE NEST CLOTHING shipping charges, delivery times, the 7-day return window, cash-on-delivery terms and how we handle your data.",
      },
      { property: "og:title", content: "Shipping, Returns & Privacy — AVENUE NEST CLOTHING" },
      {
        property: "og:description",
        content: "Shipping rates, returns, cash-on-delivery terms and privacy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Policies,
});

const SECTIONS = [
  {
    title: "Shipping",
    body: "Flat ₹100 shipping on orders below ₹1000. Orders of ₹1000 and above ship free. Dispatch happens within 2 working days and most addresses in India receive delivery within 3–7 working days.",
  },
  {
    title: "Cash on delivery",
    body: "Cash on delivery is our only payment method. Please keep the exact amount ready. Our courier will attempt delivery twice; if both attempts fail, the order returns to us and is cancelled.",
  },
  {
    title: "Returns & exchanges",
    body: "Unworn pieces with tags intact can be returned within 7 days of delivery for a size exchange or a refund by bank transfer. Write to us with your order number to start a return.",
  },
  {
    title: "Cancellations",
    body: "You can cancel any order before it is marked shipped — just contact us with your order number and we will confirm the cancellation.",
  },
  {
    title: "Privacy",
    body: "We collect only what we need to deliver your order: name, phone, address and, if you create an account, your email. We never sell your data and never share it beyond our delivery partner.",
  },
];

function Policies() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-5 py-20 md:px-8">
        <p className="eyebrow">The fine print</p>
        <h1 className="mt-4 text-4xl md:text-6xl">Policies</h1>
        <div className="mt-12 divide-y divide-border border-y border-border">
          {SECTIONS.map((s) => (
            <section key={s.title} className="py-8">
              <h2 className="text-lg">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}
