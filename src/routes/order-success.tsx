import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { formatINR } from "@/lib/shop";

type SuccessSearch = {
  order: string;
  subtotal: number;
  shipping: number;
  total: number;
};

export const Route = createFileRoute("/order-success")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    order: String(search["order"] ?? ""),
    subtotal: Number(search["subtotal"] ?? 0),
    shipping: Number(search["shipping"] ?? 0),
    total: Number(search["total"] ?? 0),
  }),
  head: () => ({
    meta: [
      { title: "Order Confirmed — AVENUE NEST CLOTHING" },
      {
        name: "description",
        content: "Your AVENUE NEST CLOTHING order is confirmed. Pay in cash when it arrives.",
      },
      { property: "og:title", content: "Order Confirmed — AVENUE NEST CLOTHING" },
      { property: "og:description", content: "Your cash-on-delivery order is confirmed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const { order, subtotal, shipping, total } = Route.useSearch();

  return (
    <Layout>
      <div className="mx-auto max-w-xl px-5 py-24 text-center md:px-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-ink text-background">
          <Check className="size-6" />
        </div>
        <h1 className="mt-8 text-4xl">Order confirmed</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you. We've received your order and will call to confirm delivery. Keep your order
          number handy.
        </p>

        <div className="mt-10 bg-surface p-6 text-left">
          <p className="eyebrow">Order number</p>
          <p className="mt-1 font-display text-2xl font-extrabold tracking-[-0.02em]">{order}</p>
          <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <dt>Pay on delivery</dt>
              <dd>{formatINR(total)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/shop"
            className="bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background"
          >
            Keep shopping
          </Link>
          <Link
            to="/orders"
            className="border border-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em]"
          >
            My orders
          </Link>
        </div>
      </div>
    </Layout>
  );
}
