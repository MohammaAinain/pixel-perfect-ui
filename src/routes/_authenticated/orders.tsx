import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — Modish Clothing" },
      {
        name: "description",
        content: "Track the status of every Modish Clothing order placed with your account.",
      },
      { property: "og:title", content: "My Orders — Modish Clothing" },
      { property: "og:description", content: "Track your Modish Clothing orders." },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,subtotal,shipping_fee,total,created_at,city,state,order_items(product_name,product_price,size,quantity)",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
        <h1 className="text-4xl md:text-5xl">My orders</h1>

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading your orders…</p>}
        {error && (
          <p className="mt-10 text-sm text-destructive">
            We couldn't load your orders. Please refresh.
          </p>
        )}

        {data && data.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Link
              to="/shop"
              className="mt-6 inline-block bg-ink px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background"
            >
              Start shopping
            </Link>
          </div>
        )}

        <div className="mt-10 space-y-6">
          {data?.map((o) => (
            <article key={o.id} className="border border-border p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-extrabold tracking-[-0.02em]">
                    {o.order_number}
                  </p>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {o.city}, {o.state}
                  </p>
                </div>
                <span className="bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
                  {o.status}
                </span>
              </div>

              <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                {o.order_items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {i.product_name}
                      {i.size ? ` · ${i.size}` : ""} × {i.quantity}
                    </span>
                    <span>{formatINR(Number(i.product_price) * i.quantity)}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatINR(Number(o.subtotal))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>
                    {Number(o.shipping_fee) === 0 ? "Free" : formatINR(Number(o.shipping_fee))}
                  </dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt>Total</dt>
                  <dd>{formatINR(Number(o.total))}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}
