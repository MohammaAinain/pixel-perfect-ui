import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

async function requireAdmin(context: AdminContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Administrator access required");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signedImageUrls(client: Awaited<ReturnType<typeof requireAdmin>>, paths: string[]) {
  const privatePaths = [...new Set(paths.filter((path) => path && !path.startsWith("/") && !/^https?:\/\//i.test(path)))];
  if (!privatePaths.length) return new Map<string, string>();
  const { data } = await client.storage.from("product-images").createSignedUrls(privatePaths, 3600);
  return new Map((data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
}

export const verifyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    return { allowed: true };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: analytics, error: analyticsError }, { data: orders, error: ordersError }] =
      await Promise.all([
        db.rpc("get_admin_analytics", { _admin_user_id: context.userId }),
        db.from("orders")
          .select("id,order_number,customer_name,total,status,created_at,order_items(product_name,quantity)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
    if (analyticsError) throw new Error(analyticsError.message);
    if (ordersError) throw new Error(ordersError.message);
    return { analytics, recentOrders: orders ?? [] };
  });

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data, error } = await db.from("products")
      .select("id,name,slug,description,category_id,price,discount_percent,sale_price,sizes,stock,stock_by_size,sku,featured,bestseller,new_arrival,active,categories(name),product_images(id,image_path,display_order)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const paths = rows.flatMap((row) => (row.product_images ?? []).map((image) => image.image_path));
    const signed = await signedImageUrls(db, paths);
    return rows.map((row) => {
      const images = [...(row.product_images ?? [])].sort((a, b) => a.display_order - b.display_order);
      return {
        ...row,
        images: images.map((image) => image.image_path),
        imageUrls: images.map((image) => signed.get(image.image_path) ?? image.image_path),
        stock_by_size: row.stock_by_size as Record<string, number>,
      };
    });
  });

export const getAdminCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data, error } = await db.from("categories")
      .select("id,name,slug,image,active,display_order")
      .order("display_order");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const signed = await signedImageUrls(db, rows.flatMap((row) => row.image ? [row.image] : []));
    return rows.map((row) => ({ ...row, imageUrl: row.image ? signed.get(row.image) ?? row.image : null }));
  });

export const getAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data, error } = await db.from("orders")
      .select("*,order_items(id,product_id,product_name,product_price,size,quantity)")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: profiles, error: profileError }, { data: authData, error: authError }, { data: orders, error: orderError }] =
      await Promise.all([
        db.from("profiles").select("user_id,name,phone,created_at").order("created_at", { ascending: false }).limit(1000),
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        db.from("orders").select("id,user_id,order_number,total,status,created_at").not("user_id", "is", null).order("created_at", { ascending: false }).limit(1000),
      ]);
    if (profileError) throw new Error(profileError.message);
    if (authError) throw new Error(authError.message);
    if (orderError) throw new Error(orderError.message);
    const emailById = new Map((authData.users ?? []).map((user) => [user.id, user.email ?? ""]));
    const ordersByUser = new Map<string, typeof orders>();
    for (const order of orders ?? []) {
      if (!order.user_id) continue;
      const list = ordersByUser.get(order.user_id) ?? [];
      list.push(order);
      ordersByUser.set(order.user_id, list);
    }
    return (profiles ?? []).map((profile) => ({
      ...profile,
      email: emailById.get(profile.user_id) ?? "",
      orders: ordersByUser.get(profile.user_id) ?? [],
    }));
  });

export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(2).max(140),
    description: z.string().max(4000).nullable(),
    category_id: z.string().uuid().nullable(),
    price: z.number().min(0).max(10000000),
    discount_percent: z.number().int().min(0).max(90),
    sizes: z.array(z.string().trim().min(1).max(16)).max(20),
    stock: z.number().int().min(0).max(2147483647),
    stock_by_size: z.record(z.string(), z.number().int().min(0).max(2147483647)),
    sku: z.string().trim().max(60).nullable(),
    featured: z.boolean(),
    bestseller: z.boolean(),
    new_arrival: z.boolean(),
    active: z.boolean(),
    images: z.array(z.string().min(1).max(500)).max(12),
  }).refine((value) => Object.keys(value.stock_by_size).every((size) => value.sizes.includes(size)), {
    message: "Size inventory must match the selected sizes",
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const stockBySize = Object.keys(data.stock_by_size).length ? data.stock_by_size : {};
    const stock = Object.values(stockBySize).length ? Object.values(stockBySize).reduce((sum, value) => sum + value, 0) : data.stock;
    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      category_id: data.category_id,
      price: data.price,
      discount_percent: data.discount_percent,
      sale_price: data.discount_percent ? Number((data.price * (1 - data.discount_percent / 100)).toFixed(2)) : null,
      sizes: data.sizes,
      stock,
      stock_by_size: stockBySize,
      sku: data.sku,
      featured: data.featured,
      bestseller: data.bestseller,
      new_arrival: data.new_arrival,
      active: data.active,
    };
    const { data: product, error } = data.id
      ? await db.from("products").update(payload).eq("id", data.id).select("id").single()
      : await db.from("products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    const productId = product.id;
    const { data: oldImages, error: imageReadError } = await db.from("product_images").select("image_path").eq("product_id", productId);
    if (imageReadError) throw new Error(imageReadError.message);
    const removedImages = (oldImages ?? []).map((image) => image.image_path).filter((path) => !data.images.includes(path));
    const { error: deleteRowsError } = await db.from("product_images").delete().eq("product_id", productId);
    if (deleteRowsError) throw new Error(deleteRowsError.message);
    if (data.images.length) {
      const { error: insertImagesError } = await db.from("product_images").insert(data.images.map((image_path, display_order) => ({ product_id: productId, image_path, display_order })));
      if (insertImagesError) throw new Error(insertImagesError.message);
    }
    const storedImages = removedImages.filter((path) => !path.startsWith("/") && !/^https?:\/\//i.test(path));
    if (storedImages.length) await db.storage.from("product-images").remove(storedImages);
    return { id: productId };
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: images } = await db.from("product_images").select("image_path").eq("product_id", data.id);
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const paths = (images ?? []).map((item) => item.image_path).filter((path) => !path.startsWith("/") && !/^https?:\/\//i.test(path));
    if (paths.length) await db.storage.from("product-images").remove(paths);
    return { ok: true };
  });

export const saveAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().min(2).max(100),
    image: z.string().max(500).nullable(),
    active: z.boolean(),
    display_order: z.number().int().min(0).max(10000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { id, ...payload } = data;
    const result = id
      ? await db.from("categories").update(payload).eq("id", id)
      : await db.from("categories").insert(payload);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: category } = await db.from("categories").select("image").eq("id", data.id).maybeSingle();
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const image = category?.image;
    if (image && !image.startsWith("/") && !/^https?:\/\//i.test(image)) await db.storage.from("product-images").remove([image]);
    return { ok: true };
  });

export const updateAdminOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.rpc("admin_update_order_status", {
      _admin_user_id: context.userId,
      _order_id: data.id,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAdminHomepage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    eyebrow: z.string().trim().max(100),
    headline: z.string().trim().min(2).max(140),
    body: z.string().trim().max(500),
    image_path: z.string().trim().min(1).max(500),
    button_label: z.string().trim().min(1).max(50),
    button_href: z.string().trim().regex(/^\/(?!\/)[a-zA-Z0-9/_-]*(?:\?[a-zA-Z0-9=&_-]*)?$/),
    active: z.boolean(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("homepage_content").upsert({ id: "primary", ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    store_name: z.string().trim().min(2).max(100),
    low_stock_threshold: z.number().int().min(0).max(10000),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("store_settings").upsert({ id: "primary", ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminHomepageAndSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: homepage, error: homepageError }, { data: settings, error: settingsError }] = await Promise.all([
      db.from("homepage_content").select("id,image_path,eyebrow,headline,body,button_label,button_href,active").eq("id", "primary").maybeSingle(),
      db.from("store_settings").select("id,store_name,low_stock_threshold").eq("id", "primary").maybeSingle(),
    ]);
    if (homepageError) throw new Error(homepageError.message);
    if (settingsError) throw new Error(settingsError.message);
    const path = homepage?.image_path;
    const signed = path ? await signedImageUrls(db, [path]) : new Map<string, string>();
    return { homepage: homepage ? { ...homepage, imageUrl: signed.get(path ?? "") ?? path } : null, settings };
  });