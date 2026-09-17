import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_percent: number;
  sale_price: number | null;
  sizes: string[];
  stock: number;
  sku: string | null;
  featured: boolean;
  bestseller: boolean;
  new_arrival: boolean;
  category: { name: string; slug: string } | null;
  images: string[];
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SELECT =
  "id,name,slug,description,price,discount_percent,sale_price,sizes,stock,sku,featured,bestseller,new_arrival,created_at,categories(name,slug),product_images(image_path,display_order)";

/* eslint-disable @typescript-eslint/no-explicit-any */
function shape(row: any): CatalogProduct {
  const images = (row.product_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((i: any) => i.image_path as string);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    discount_percent: row.discount_percent,
    sale_price: row.sale_price === null ? null : Number(row.sale_price),
    sizes: row.sizes ?? [],
    stock: row.stock,
    sku: row.sku,
    featured: row.featured,
    bestseller: row.bestseller,
    new_arrival: row.new_arrival,
    category: row.categories ? { name: row.categories.name, slug: row.categories.slug } : null,
    images,
  };
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("categories")
    .select("id,name,slug,image")
    .eq("active", true)
    .order("display_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogCategory[];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        category: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(["new", "price-asc", "price-desc", "name"]).optional(),
        flag: z.enum(["featured", "bestseller", "new_arrival"]).optional(),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = publicClient().from("products").select(SELECT).eq("active", true);
    if (data.flag) q = q.eq(data.flag, true);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.category) {
      const { data: cat } = await publicClient()
        .from("categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      if (!cat) return [];
      q = q.eq("category_id", cat.id);
    }
    if (data.sort === "price-asc") q = q.order("price", { ascending: true });
    else if (data.sort === "price-desc") q = q.order("price", { ascending: false });
    else if (data.sort === "name") q = q.order("name", { ascending: true });
    else q = q.order("created_at", { ascending: false });
    if (data.limit) q = q.limit(data.limit);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(shape);
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("products")
      .select(SELECT)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? shape(row) : null;
  });
