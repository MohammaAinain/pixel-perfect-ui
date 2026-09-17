import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().email().optional().or(z.literal("")),
  customer_phone: z.string().trim().min(8).max(20),
  address_line1: z.string().trim().min(4).max(160),
  address_line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{4,8}$/),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        size: z.string().max(12).nullable(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(30),
});

export type PlacedOrder = {
  order_number: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
};

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data }): Promise<PlacedOrder> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Optional sign-in: attach the order to a user only when a valid token is sent.
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token.split(".").length === 3) {
        const { data: claims } = await supabaseAdmin.auth.getClaims(token);
        userId = (claims?.claims?.sub as string | undefined) ?? null;
      }
    }

    const { data: result, error } = await supabaseAdmin.rpc("place_order", {
      _user_id: userId,
      _customer_name: data.customer_name,
      _customer_email: data.customer_email || null,
      _customer_phone: data.customer_phone,
      _address_line1: data.address_line1,
      _address_line2: data.address_line2 || null,
      _city: data.city,
      _state: data.state,
      _pincode: data.pincode,
      _notes: data.notes || null,
      _items: data.items,
    });

    if (error) throw new Error(error.message);
    const r = result as unknown as PlacedOrder;
    return {
      order_number: r.order_number,
      subtotal: Number(r.subtotal),
      shipping_fee: Number(r.shipping_fee),
      total: Number(r.total),
    };
  });
