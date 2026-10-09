import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/site/Layout";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/shop";
import { placeOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — AVENUE NEST CLOTHING" },
      {
        name: "description",
        content:
          "Enter your delivery details and place a cash-on-delivery order with AVENUE NEST CLOTHING. No account required.",
      },
      { property: "og:title", content: "Checkout — AVENUE NEST CLOTHING" },
      { property: "og:description", content: "Cash on delivery checkout, no account required." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checkout,
});

const FIELDS = [
  { name: "customer_name", label: "Full name", required: true },
  { name: "customer_phone", label: "Phone number", required: true },
  { name: "customer_email", label: "Email (optional)", required: false },
  { name: "address_line1", label: "Address line 1", required: true },
  { name: "address_line2", label: "Address line 2 (optional)", required: false },
  { name: "city", label: "City", required: true },
  { name: "state", label: "State", required: true },
  { name: "pincode", label: "PIN code", required: true },
] as const;

function Checkout() {
  const { lines, subtotal, shipping, total, clear, ready } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lines.length === 0) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const result = await submit({
        data: {
          customer_name: String(fd.get("customer_name") ?? ""),
          customer_email: String(fd.get("customer_email") ?? ""),
          customer_phone: String(fd.get("customer_phone") ?? ""),
          address_line1: String(fd.get("address_line1") ?? ""),
          address_line2: String(fd.get("address_line2") ?? ""),
          city: String(fd.get("city") ?? ""),
          state: String(fd.get("state") ?? ""),
          pincode: String(fd.get("pincode") ?? ""),
          notes: String(fd.get("notes") ?? ""),
          items: lines.map((l) => ({
            product_id: l.productId,
            size: l.size,
            quantity: l.quantity,
          })),
        },
      });
      clear();
      navigate({
        to: "/order-success",
        search: {
          order: result.order_number,
          subtotal: result.subtotal,
          shipping: result.shipping_fee,
          total: result.total,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(
        message.includes("stock")
          ? message
          : message.includes("parse") || message.includes("invalid")
            ? "Please check your delivery details."
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  if (ready && lines.length === 0) {
    return (
      <Layout>
        <div className="py-32 text-center">
          <h1 className="text-2xl">Your bag is empty</h1>
          <Link to="/shop" className="mt-4 inline-block text-sm underline">
            Back to shop
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <h1 className="text-4xl md:text-5xl">Checkout</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cash on delivery only. No account needed — we'll confirm by phone.
        </p>

        <form onSubmit={onSubmit} className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label
                key={f.name}
                className={f.name.startsWith("address") ? "sm:col-span-2" : undefined}
              >
                <span className="eyebrow">{f.label}</span>
                <input
                  name={f.name}
                  required={f.required}
                  type={f.name === "customer_email" ? "email" : "text"}
                  inputMode={
                    f.name === "customer_phone" || f.name === "pincode" ? "numeric" : undefined
                  }
                  className="mt-2 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus:border-ink"
                />
              </label>
            ))}
            <label className="sm:col-span-2">
              <span className="eyebrow">Delivery notes (optional)</span>
              <textarea
                name="notes"
                rows={3}
                className="mt-2 w-full border border-border bg-background p-3 text-sm outline-none focus:border-ink"
              />
            </label>
          </div>

          <aside className="h-fit bg-surface p-6">
            <h2 className="text-lg">Your order</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {lines.map((l) => (
                <li key={`${l.productId}-${l.size ?? ""}`} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {l.name}
                    {l.size ? ` · ${l.size}` : ""} × {l.quantity}
                  </span>
                  <span>{formatINR(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Total due on delivery</dt>
                <dd>{formatINR(total)}</dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={busy}
              className="mt-6 w-full bg-ink px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-background disabled:opacity-50"
            >
              {busy ? "Placing order…" : "Place COD order"}
            </button>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
