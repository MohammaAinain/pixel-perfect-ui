import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Activity, ArrowLeft, BarChart3, Boxes, Check, ChevronRight, ClipboardList,
  ImagePlus, LayoutDashboard, LoaderCircle, Package, Pencil, Plus, Settings2,
  ShoppingCart, Trash2, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, ORDER_STATUSES } from "@/lib/shop";
import {
  deleteAdminCategory, deleteAdminProduct, getAdminCategories, getAdminCustomers,
  getAdminHomepageAndSettings, getAdminOrders, getAdminOverview, getAdminProducts,
  saveAdminCategory, saveAdminHomepage, saveAdminProduct, saveAdminSettings,
  updateAdminOrderStatus, verifyAdmin,
} from "@/lib/admin.functions";

type Section = "overview" | "products" | "inventory" | "orders" | "categories" | "customers" | "analytics" | "website" | "settings";
type Product = Awaited<ReturnType<typeof getAdminProducts>>[number];
type Category = Awaited<ReturnType<typeof getAdminCategories>>[number];
type HomepageSettings = Awaited<ReturnType<typeof getAdminHomepageAndSettings>>;
type ProductDraft = {
  id?: string; name: string; slug: string; description: string; category_id: string;
  price: string; discount_percent: string; sizes: string; stock: string; stock_by_size: string;
  sku: string; featured: boolean; bestseller: boolean; new_arrival: boolean; active: boolean; images: string[];
};
type CategoryDraft = { id?: string; name: string; slug: string; image: string; active: boolean; display_order: string };

const sections: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "categories", label: "Categories", icon: ClipboardList },
  { id: "customers", label: "Customers", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "website", label: "Website content", icon: ImagePlus },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const blankProduct = (): ProductDraft => ({
  name: "", slug: "", description: "", category_id: "", price: "", discount_percent: "0",
  sizes: "", stock: "0", stock_by_size: "", sku: "", featured: false, bestseller: false,
  new_arrival: false, active: true, images: [],
});
const blankCategory = (): CategoryDraft => ({ name: "", slug: "", image: "", active: true, display_order: "0" });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (value: unknown) => formatINR(Number(value ?? 0));
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Store Admin — Avenuenest Clothing" },
      { name: "description", content: "Manage products, inventory, orders and store content." },
      { property: "og:title", content: "Store Admin — Avenuenest Clothing" },
      { property: "og:description", content: "Manage store operations and website content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => verifyAdmin(),
  errorComponent: AdminAccessError,
  component: AdminPage,
});

function AdminAccessError() {
  return <main className="grid min-h-screen place-items-center px-6"><div className="max-w-md text-center"><p className="eyebrow">Store administration</p><h1 className="mt-3 text-3xl">Access unavailable</h1><p className="mt-4 text-sm text-muted-foreground">This area is only available to an approved store administrator.</p><Button asChild className="mt-7"><Link to="/">Return to store</Link></Button></div></main>;
}

function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getAdminOverview);
  const productsFn = useServerFn(getAdminProducts);
  const categoriesFn = useServerFn(getAdminCategories);
  const ordersFn = useServerFn(getAdminOrders);
  const customersFn = useServerFn(getAdminCustomers);
  const contentFn = useServerFn(getAdminHomepageAndSettings);
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn() });
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: () => productsFn() });
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: () => categoriesFn() });
  const orders = useQuery({ queryKey: ["admin", "orders"], queryFn: () => ordersFn() });
  const customers = useQuery({ queryKey: ["admin", "customers"], queryFn: () => customersFn(), enabled: section === "customers" });
  const content = useQuery({ queryKey: ["admin", "content"], queryFn: () => contentFn(), enabled: section === "website" || section === "settings" });
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const refresh = async (...keys: string[]) => {
    await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: ["admin", key] })));
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const current = sections.find((item) => item.id === section) ?? sections[0];
  const chooseSection = (id: Section) => { setSection(id); setMobileNav(false); setProductDraft(null); setCategoryDraft(null); };

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-r border-border bg-ink text-background lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-background/10 px-6">
          <img src="/img/avenue-nest-mark.png" alt="" className="size-9 object-contain invert" />
          <div><p className="text-xs font-extrabold uppercase">Avenuenest</p><p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-background/50">Store admin</p></div>
        </div>
        <nav aria-label="Admin sections" className="flex-1 space-y-1 px-3 py-5">
          {sections.map((item) => <NavButton key={item.id} item={item} active={section === item.id} onClick={() => chooseSection(item.id)} dark />)}
        </nav>
        <Link to="/" className="m-4 flex items-center gap-2 border-t border-background/10 px-3 pt-5 text-xs uppercase tracking-[0.12em] text-background/65 hover:text-background"><ArrowLeft className="size-4" /> Back to store</Link>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><Button variant="outline" size="icon" className="lg:hidden" aria-label="Open admin menu" onClick={() => setMobileNav(!mobileNav)}><LayoutDashboard /></Button><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Avenuenest Clothing</p><h1 className="mt-0.5 text-lg font-bold normal-case tracking-normal">{current.label}</h1></div></div>
          <Link to="/" aria-label="View storefront" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"><span className="hidden sm:inline">View store</span><ChevronRight className="size-4" /></Link>
        </header>
        {mobileNav && <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMobileNav(false)}><nav aria-label="Admin sections" className="h-full w-[min(84vw,320px)] bg-ink p-4 text-background" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><span className="text-sm font-bold uppercase">Avenuenest admin</span><Button variant="ghost" size="icon" aria-label="Close admin menu" onClick={() => setMobileNav(false)}><X /></Button></div>{sections.map((item) => <NavButton key={item.id} item={item} active={section === item.id} onClick={() => chooseSection(item.id)} dark />)}<Link to="/" className="mt-6 block px-3 py-3 text-xs uppercase">Back to store</Link></nav></div>}
        <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          {section === "overview" && <OverviewSection data={overview.data} loading={overview.isLoading} error={overview.error} onNavigate={chooseSection} />}
          {section === "products" && <ProductsSection rows={products.data ?? []} categories={categories.data ?? []} loading={products.isLoading} error={products.error} draft={productDraft} setDraft={setProductDraft} refresh={() => refresh("products", "overview")} />}
          {section === "inventory" && <InventorySection rows={products.data ?? []} threshold={Number(content.data?.settings?.low_stock_threshold ?? 5)} loading={products.isLoading} onEdit={(row) => { setProductDraft(toProductDraft(row)); setSection("products"); }} />}
          {section === "orders" && <OrdersSection rows={orders.data ?? []} loading={orders.isLoading} selected={selectedOrder} setSelected={setSelectedOrder} refresh={() => refresh("orders", "overview", "products")} />}
          {section === "categories" && <CategoriesSection rows={categories.data ?? []} loading={categories.isLoading} draft={categoryDraft} setDraft={setCategoryDraft} refresh={() => refresh("categories", "products")} />}
          {section === "customers" && <CustomersSection rows={customers.data ?? []} loading={customers.isLoading} error={customers.error} />}
          {section === "analytics" && <AnalyticsSection analytics={overview.data?.analytics} loading={overview.isLoading} error={overview.error} />}
          {section === "website" && <WebsiteSection value={content.data} loading={content.isLoading} refresh={() => refresh("content")} />}
          {section === "settings" && <SettingsSection value={content.data} loading={content.isLoading} refresh={() => refresh("content")} />}
        </main>
      </div>
    </div>
  );
}

function NavButton({ item, active, onClick, dark = false }: { item: (typeof sections)[number]; active: boolean; onClick: () => void; dark?: boolean }) {
  const Icon = item.icon;
  return <Button variant="ghost" onClick={onClick} className={`h-11 w-full justify-start gap-3 rounded-none px-3 text-xs font-semibold ${dark ? active ? "bg-background/15 text-background hover:bg-background/15 hover:text-background" : "text-background/65 hover:bg-background/10 hover:text-background" : active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}><Icon className="size-4" />{item.label}</Button>;
}

function PageIntro({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-2 text-3xl normal-case tracking-normal">{title}</h2></div>{action}</div>;
}

function LoadingLine() { return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading store data</div>; }
function ErrorLine({ message }: { message?: string }) { return <p role="alert" className="py-8 text-sm text-destructive">{message ?? "We couldn't load this information. Refresh and try again."}</p>; }
function Metric({ title, value, detail, icon: Icon }: { title: string; value: React.ReactNode; detail: string; icon: typeof Package }) {
  return <article className="border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm text-muted-foreground">{title}</p><Icon className="size-4 text-muted-foreground" /></div><p className="mt-6 text-3xl font-bold tabular-nums">{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></article>;
}

function OverviewSection({ data, loading, error, onNavigate }: { data?: Awaited<ReturnType<typeof getAdminOverview>>; loading: boolean; error: Error | null; onNavigate: (section: Section) => void }) {
  const analytics = data?.analytics as Record<string, unknown> | null | undefined;
  return <>
    <PageIntro eyebrow="Avenuenest Clothing" title="Store overview" action={<Button variant="outline" onClick={() => onNavigate("orders")}><ShoppingCart /> Review orders</Button>} />
    {loading ? <LoadingLine /> : error ? <ErrorLine message={error.message} /> : <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric title="All orders" value={String(analytics?.order_count ?? 0)} detail={`${analytics?.pending_orders ?? 0} awaiting action`} icon={ShoppingCart} />
        <Metric title="Net sales" value={money(analytics?.sales_total)} detail="Excludes cancelled orders" icon={Activity} />
        <Metric title="Active products" value={String(analytics?.active_product_count ?? 0)} detail={`${analytics?.product_count ?? 0} products total`} icon={Package} />
        <Metric title="Low stock" value={String(analytics?.low_stock_count ?? 0)} detail="At or below your alert level" icon={Boxes} />
      </div>
      <div className="mt-8 border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="eyebrow">Latest activity</p><h3 className="mt-1 text-lg normal-case tracking-normal">Recent orders</h3></div><Button variant="outline" size="sm" onClick={() => onNavigate("orders")}>All orders</Button></div>
        <OrderRows rows={data?.recentOrders ?? []} />
      </div>
    </>}
  </>;
}

function TableWrap({ children }: { children: React.ReactNode }) { return <div className="w-full overflow-x-auto">{children}</div>; }
function EmptyTable({ children }: { children: React.ReactNode }) { return <p className="px-5 py-12 text-center text-sm text-muted-foreground">{children}</p>; }

function ProductsSection({ rows, categories, loading, error, draft, setDraft, refresh }: { rows: Product[]; categories: Category[]; loading: boolean; error: Error | null; draft: ProductDraft | null; setDraft: (draft: ProductDraft | null) => void; refresh: () => Promise<void> }) {
  const save = useServerFn(saveAdminProduct);
  const remove = useServerFn(deleteAdminProduct);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => rows.filter((row) => `${row.name} ${row.sku ?? ""}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const open = (row?: Product) => setDraft(row ? toProductDraft(row) : blankProduct());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const sizes = draft.sizes.split(",").map((item) => item.trim()).filter(Boolean);
      const stockBySize: Record<string, number> = {};
      for (const item of draft.stock_by_size.split(",").map((value) => value.trim()).filter(Boolean)) {
        const [size, rawQty] = item.split(":").map((value) => value.trim());
        if (!size || !rawQty || !/^\d+$/.test(rawQty)) throw new Error("Enter size stock as S:4, M:6");
        stockBySize[size] = Number(rawQty);
      }
      if (Object.keys(stockBySize).some((size) => !sizes.includes(size))) throw new Error("Every stock size must also be listed in sizes.");
      const price = Number(draft.price);
      const discount = Number(draft.discount_percent);
      if (!Number.isFinite(price) || !Number.isInteger(discount)) throw new Error("Enter a valid price and whole-number discount.");
      await save({ data: {
        ...(draft.id ? { id: draft.id } : {}), name: draft.name, slug: draft.slug || slugify(draft.name), description: draft.description || null,
        category_id: draft.category_id || null, price, discount_percent: discount, sizes, stock: Number(draft.stock) || 0,
        stock_by_size: stockBySize, sku: draft.sku || null, featured: draft.featured, bestseller: draft.bestseller,
        new_arrival: draft.new_arrival, active: draft.active, images: draft.images,
      } });
      toast.success(draft.id ? "Product updated" : "Product added");
      setDraft(null);
      await refresh();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not save product"); }
    finally { setBusy(false); }
  }

  async function deleteProduct(row: Product) {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try { await remove({ data: { id: row.id } }); toast.success("Product deleted"); await refresh(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not delete product"); }
  }

  return <>
    <PageIntro eyebrow="Catalogue" title="Products" action={<Button onClick={() => open()}><Plus /> Add product</Button>} />
    {draft && <ProductEditor draft={draft} setDraft={setDraft} categories={categories} busy={busy} onSubmit={submit} onCancel={() => setDraft(null)} />}
    <div className="mb-4 max-w-sm"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU" aria-label="Search products" /></div>
    {loading ? <LoadingLine /> : error ? <ErrorLine message={error.message} /> : <div className="border border-border bg-card"><TableWrap><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Inventory</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((row) => <tr key={row.id}><td className="px-4 py-3"><div className="flex items-center gap-3">{row.imageUrls[0] ? <img src={row.imageUrls[0]} alt="" className="size-11 object-cover" /> : <div className="grid size-11 place-items-center bg-muted"><Package className="size-4" /></div>}<div><p className="font-semibold">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{row.sku || row.slug}</p></div></div></td><td className="px-4 py-3 text-muted-foreground">{row.categories?.name ?? "—"}</td><td className="px-4 py-3">{money(row.sale_price ?? row.price)}</td><td className="px-4 py-3 tabular-nums">{row.stock}</td><td className="px-4 py-3"><StatusPill status={row.active ? "active" : "inactive"} /></td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${row.name}`} onClick={() => open(row)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`} onClick={() => void deleteProduct(row)}><Trash2 /></Button></div></td></tr>)}</tbody></table></TableWrap>{filtered.length === 0 && <EmptyTable>No products match that search.</EmptyTable>}</div>}
  </>;
}

function toProductDraft(row: Product): ProductDraft {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description ?? "", category_id: row.category_id ?? "", price: String(row.price), discount_percent: String(row.discount_percent), sizes: row.sizes.join(", "), stock: String(row.stock), stock_by_size: Object.entries(row.stock_by_size ?? {}).map(([size, qty]) => `${size}:${qty}`).join(", "), sku: row.sku ?? "", featured: row.featured, bestseller: row.bestseller, new_arrival: row.new_arrival, active: row.active, images: row.images };
}

function ProductEditor({ draft, setDraft, categories, busy, onSubmit, onCancel }: { draft: ProductDraft; setDraft: (value: ProductDraft | null) => void; categories: Category[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const update = (key: keyof ProductDraft, value: string | boolean | string[]) => setDraft({ ...draft, [key]: value });
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Choose image files smaller than 10 MB.");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw new Error(error.message);
        uploaded.push(path);
      }
      update("images", [...draft.images, ...uploaded]);
      setPreviews((prev) => [...prev, ...uploaded.map((path) => supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl)]);
      toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Image upload failed"); }
    finally { setUploading(false); }
  }
  return <section className="mb-6 border border-border bg-card p-5 md:p-7"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="eyebrow">Catalogue editor</p><h3 className="mt-1 text-xl normal-case tracking-normal">{draft.id ? "Edit product" : "New product"}</h3></div><Button variant="ghost" size="icon" aria-label="Close editor" onClick={onCancel}><X /></Button></div>
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Product name"><Input value={draft.name} required onChange={(e) => { const name = e.target.value; setDraft({ ...draft, name, slug: draft.id ? draft.slug : slugify(name) }); }} /></Field>
      <Field label="URL name"><Input value={draft.slug} required onChange={(e) => update("slug", slugify(e.target.value))} /></Field>
      <Field label="Category"><select aria-label="Category" value={draft.category_id} onChange={(e) => update("category_id", e.target.value)} className="h-10 w-full border border-input bg-background px-3 text-sm"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label="SKU"><Input value={draft.sku} onChange={(e) => update("sku", e.target.value)} /></Field>
      <Field label="Price (₹)"><Input type="number" min="0" step="0.01" required value={draft.price} onChange={(e) => update("price", e.target.value)} /></Field>
      <Field label="Discount (%)"><Input type="number" min="0" max="90" required value={draft.discount_percent} onChange={(e) => update("discount_percent", e.target.value)} /></Field>
      <Field label="Sizes (comma-separated)"><Input placeholder="S, M, L, XL" value={draft.sizes} onChange={(e) => update("sizes", e.target.value)} /></Field>
      <Field label="Size stock (e.g. S:4, M:6)"><Input placeholder="S:4, M:6" value={draft.stock_by_size} onChange={(e) => update("stock_by_size", e.target.value)} /></Field>
      <Field label="Total stock (used when size stock is blank)"><Input type="number" min="0" step="1" value={draft.stock} onChange={(e) => update("stock", e.target.value)} /></Field>
      <div className="grid content-center grid-cols-2 gap-3">{([["active", "Active"], ["featured", "Featured"], ["bestseller", "Bestseller"], ["new_arrival", "New arrival"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox checked={draft[key]} onCheckedChange={(checked) => update(key, checked === true)} />{label}</label>)}</div>
      <div className="md:col-span-2"><Field label="Description"><Textarea rows={4} value={draft.description} onChange={(e) => update("description", e.target.value)} /></Field></div>
      <div className="md:col-span-2"><Label className="eyebrow">Product images</Label><div className="mt-2 flex flex-wrap gap-2">{draft.images.map((path, index) => { const rowUrl = path.startsWith("/") ? path : path.startsWith("http") ? path : previews[draft.images.slice(0, index).filter((entry) => !entry.startsWith("/") && !entry.startsWith("http")).length] ?? ""; return <div key={`${path}-${index}`} className="relative size-20 overflow-hidden bg-muted">{rowUrl ? <img src={rowUrl} alt="Product preview" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[9px] text-muted-foreground">Saved image</span>}<Button variant="destructive" size="icon" aria-label="Remove image" className="absolute right-0 top-0 size-6" onClick={() => update("images", draft.images.filter((_, itemIndex) => itemIndex !== index))}><X className="size-3" /></Button></div>})}<label className="grid size-20 cursor-pointer place-items-center border border-dashed border-border text-muted-foreground hover:bg-muted" aria-label="Upload product images"><ImagePlus className="size-5" /><input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => { void upload(e.target.files); e.currentTarget.value = ""; }} /></label></div><p className="mt-2 text-xs text-muted-foreground">{uploading ? "Uploading images…" : "Upload multiple image files. Each file can be up to 10 MB."}</p></div>
      <div className="flex justify-end gap-2 pt-2 md:col-span-2"><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button disabled={busy || uploading} type="submit">{busy ? "Saving…" : draft.id ? "Save changes" : "Create product"}</Button></div>
    </form>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground">{label}</Label>{children}</div>; }

function InventorySection({ rows, threshold, loading, onEdit }: { rows: Product[]; threshold: number; loading: boolean; onEdit: (row: Product) => void }) {
  const low = rows.filter((row) => row.active && row.stock <= threshold).sort((a, b) => a.stock - b.stock);
  return <><PageIntro eyebrow="Stock control" title="Inventory" action={<p className="text-sm text-muted-foreground">Alert level <strong className="text-foreground">{threshold} units</strong></p>} />{loading ? <LoadingLine /> : <><div className="mb-5 border-l-2 border-foreground bg-secondary px-4 py-3"><p className="text-sm font-semibold">{low.length} product{low.length === 1 ? "" : "s"} at or below low-stock level</p></div><div className="border border-border bg-card"><TableWrap><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Total stock</th><th className="px-4 py-3">By size</th><th className="px-4 py-3">Alert</th><th className="px-4 py-3">Update</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 tabular-nums">{row.stock}</td><td className="px-4 py-3 text-xs text-muted-foreground">{Object.keys(row.stock_by_size ?? {}).length ? Object.entries(row.stock_by_size).map(([size, quantity]) => `${size}: ${quantity}`).join(" · ") : "Total stock only"}</td><td className="px-4 py-3">{row.active && row.stock <= threshold ? <StatusPill status="low stock" /> : <span className="text-xs text-muted-foreground">Healthy</span>}</td><td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => onEdit(row)}><Pencil /> Edit stock</Button></td></tr>)}</tbody></table></TableWrap>{rows.length === 0 && <EmptyTable>No products to manage.</EmptyTable>}</div></>}</>;
}

function OrdersSection({ rows, loading, selected, setSelected, refresh }: { rows: Awaited<ReturnType<typeof getAdminOrders>>; loading: boolean; selected: string | null; setSelected: (id: string | null) => void; refresh: () => Promise<void> }) {
  const update = useServerFn(updateAdminOrderStatus);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function setStatus(id: string, status: (typeof ORDER_STATUSES)[number]) {
    setBusyId(id);
    try { await update({ data: { id, status } }); toast.success("Order status updated"); await refresh(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not update order"); }
    finally { setBusyId(null); }
  }
  return <><PageIntro eyebrow="Fulfilment" title="Orders" action={<p className="text-sm text-muted-foreground">Showing latest {rows.length} orders</p>} />{loading ? <LoadingLine /> : <div className="space-y-3">{rows.map((order) => <article key={order.id} className="border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-5"><button className="min-w-0 text-left" onClick={() => setSelected(selected === order.id ? null : order.id)}><span className="font-semibold">{order.order_number}</span><span className="mt-1 block text-xs text-muted-foreground">{order.customer_name} · {dateLabel(order.created_at)}</span></button><div className="flex items-center gap-3"><span className="hidden text-sm font-semibold sm:block">{money(order.total)}</span><Select value={order.status} disabled={busyId === order.id} onValueChange={(status) => void setStatus(order.id, status as (typeof ORDER_STATUSES)[number])}><SelectTrigger aria-label={`Status for ${order.order_number}`} className="w-36"><SelectValue /></SelectTrigger><SelectContent>{ORDER_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="icon" aria-label={`View ${order.order_number}`} onClick={() => setSelected(selected === order.id ? null : order.id)}>{selected === order.id ? <X /> : <ChevronRight />}</Button></div></div>{selected === order.id && <div className="grid gap-5 border-t border-border bg-muted/30 p-4 text-sm md:grid-cols-2 md:p-5"><div><p className="eyebrow">Customer</p><p className="mt-2 font-semibold">{order.customer_name}</p><p>{order.customer_phone}</p><p>{order.customer_email || "No email provided"}</p><p className="mt-2 text-muted-foreground">{order.address_line1}{order.address_line2 ? `, ${order.address_line2}` : ""}<br />{order.city}, {order.state} {order.pincode}</p><p className="mt-2 text-xs text-muted-foreground">{order.payment_method} · {order.status}</p></div><div><p className="eyebrow">Items & totals</p><ul className="mt-2 space-y-2">{order.order_items.map((item) => <li key={item.id} className="flex justify-between gap-4"><span>{item.product_name}{item.size ? ` · ${item.size}` : ""} × {item.quantity}</span><span>{money(Number(item.product_price) * item.quantity)}</span></li>)}</ul><dl className="mt-3 space-y-1 border-t border-border pt-3"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Shipping</dt><dd>{Number(order.shipping_fee) === 0 ? "Free" : money(order.shipping_fee)}</dd></div><div className="flex justify-between font-bold"><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>{order.notes && <p className="mt-3 text-xs text-muted-foreground">Note: {order.notes}</p>}</div></div>}</article>)}{rows.length === 0 && <div className="border border-border bg-card"><EmptyTable>No orders have been placed yet.</EmptyTable></div>}</div>}</>;
}

function OrderRows({ rows }: { rows: Awaited<ReturnType<typeof getAdminOverview>>["recentOrders"] }) {
  return <TableWrap><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><td className="px-5 py-3 font-semibold">{row.order_number}</td><td className="px-5 py-3">{row.customer_name}</td><td className="px-5 py-3">{money(row.total)}</td><td className="px-5 py-3"><StatusPill status={row.status} /></td><td className="px-5 py-3 text-muted-foreground">{dateLabel(row.created_at)}</td></tr>)}</tbody></table>{rows.length === 0 && <EmptyTable>No orders have been placed yet.</EmptyTable>}</TableWrap>;
}

function CategoriesSection({ rows, loading, draft, setDraft, refresh }: { rows: Category[]; loading: boolean; draft: CategoryDraft | null; setDraft: (draft: CategoryDraft | null) => void; refresh: () => Promise<void> }) {
  const save = useServerFn(saveAdminCategory); const remove = useServerFn(deleteAdminCategory); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!draft) return; setBusy(true); try { await save({ data: { ...(draft.id ? { id: draft.id } : {}), name: draft.name, slug: draft.slug || slugify(draft.name), image: draft.image || null, active: draft.active, display_order: Number(draft.display_order) || 0 } }); toast.success("Category saved"); setDraft(null); await refresh(); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not save category"); } finally { setBusy(false); } }
  async function deleteCategory(row: Category) { if (!window.confirm(`Delete ${row.name}?`)) return; try { await remove({ data: { id: row.id } }); toast.success("Category deleted"); await refresh(); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not delete category"); } }
  return <><PageIntro eyebrow="Catalogue structure" title="Categories" action={<Button onClick={() => setDraft(blankCategory())}><Plus /> Add category</Button>} />{draft && <section className="mb-6 border border-border bg-card p-5"><div className="mb-5 flex items-center justify-between"><h3 className="text-lg normal-case tracking-normal">{draft.id ? "Edit category" : "New category"}</h3><Button variant="ghost" size="icon" aria-label="Close category editor" onClick={() => setDraft(null)}><X /></Button></div><form onSubmit={(event) => void submit(event)} className="grid gap-4 md:grid-cols-2"><Field label="Name"><Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} /></Field><Field label="URL name"><Input required value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} /></Field><Field label="Image path (optional)"><Input placeholder="/img/category.jpg" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} /></Field><Field label="Display order"><Input type="number" min="0" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.active} onCheckedChange={(checked) => setDraft({ ...draft, active: checked === true })} />Visible in store</label><div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : "Save category"}</Button></div></form></section>}{loading ? <LoadingLine /> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article key={row.id} className="flex min-w-0 items-center gap-4 border border-border bg-card p-4">{row.imageUrl ? <img src={row.imageUrl} alt="" className="size-14 shrink-0 object-cover" /> : <div className="grid size-14 shrink-0 place-items-center bg-muted"><ClipboardList className="size-5" /></div>}<div className="min-w-0 flex-1"><p className="truncate font-semibold">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">/{row.slug} · order {row.display_order}</p></div><div className="flex"><Button variant="ghost" size="icon" aria-label={`Edit ${row.name}`} onClick={() => setDraft({ id: row.id, name: row.name, slug: row.slug, image: row.image ?? "", active: row.active, display_order: String(row.display_order) })}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`} onClick={() => void deleteCategory(row)}><Trash2 /></Button></div></article>)}{rows.length === 0 && <div className="border border-border bg-card sm:col-span-2 xl:col-span-3"><EmptyTable>No categories yet.</EmptyTable></div>}</div>}</>;
}

function CustomersSection({ rows, loading, error }: { rows: Awaited<ReturnType<typeof getAdminCustomers>>; loading: boolean; error: Error | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <><PageIntro eyebrow="Customer accounts" title="Customers" action={<p className="text-sm text-muted-foreground">{rows.length} registered profiles</p>} />{loading ? <LoadingLine /> : error ? <ErrorLine message={error.message} /> : <div className="border border-border bg-card"><TableWrap><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">History</th></tr></thead><tbody className="divide-y divide-border">{rows.map((customer) => <><tr key={customer.user_id}><td className="px-4 py-3"><p className="font-semibold">{customer.name || "Customer"}</p><p className="mt-1 text-xs text-muted-foreground">{customer.email || "Email unavailable"}</p></td><td className="px-4 py-3">{customer.phone || "—"}</td><td className="px-4 py-3 text-muted-foreground">{dateLabel(customer.created_at)}</td><td className="px-4 py-3">{customer.orders.length}</td><td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => setExpanded(expanded === customer.user_id ? null : customer.user_id)}>{expanded === customer.user_id ? "Hide" : "View orders"}</Button></td></tr>{expanded === customer.user_id && <tr key={`${customer.user_id}-history`}><td colSpan={5} className="bg-muted/30 px-5 py-4">{customer.orders.length ? <ul className="space-y-2">{customer.orders.map((order) => <li key={order.id} className="flex flex-wrap justify-between gap-2 text-xs"><span>{order.order_number} · {dateLabel(order.created_at)} · {order.status}</span><strong>{money(order.total)}</strong></li>)}</ul> : <p className="text-xs text-muted-foreground">No order history for this customer.</p>}</td></tr>}</>)}</tbody></table>{rows.length === 0 && <EmptyTable>No registered customers yet.</EmptyTable>}</div>}</>;
}

function AnalyticsSection({ analytics, loading, error }: { analytics?: unknown; loading: boolean; error: Error | null }) {
  const data = analytics as Record<string, unknown> | null | undefined;
  const days = (Array.isArray(data?.sales_by_day) ? data.sales_by_day : []) as { date: string; sales: number; orders: number }[];
  const top = (Array.isArray(data?.top_products) ? data.top_products : []) as { product_id: string | null; name: string; units_sold: number; revenue: number }[];
  const peak = Math.max(1, ...days.map((day) => Number(day.sales)));
  return <><PageIntro eyebrow="Store performance" title="Analytics" action={<span className="text-xs text-muted-foreground">Last 30 days</span>} />{loading ? <LoadingLine /> : error ? <ErrorLine message={error.message} /> : <><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric title="Gross orders" value={String(data?.order_count ?? 0)} detail={`${data?.pending_orders ?? 0} pending`} icon={ShoppingCart} /><Metric title="Sales" value={money(data?.sales_total)} detail="Completed and open orders" icon={Activity} /><Metric title="Active products" value={String(data?.active_product_count ?? 0)} detail="Available to customers" icon={Package} /><Metric title="Low stock" value={String(data?.low_stock_count ?? 0)} detail="Needs a restock review" icon={Boxes} /></div><section className="mt-6 border border-border bg-card p-5 md:p-7"><div className="flex items-center justify-between"><div><p className="eyebrow">Daily revenue</p><h3 className="mt-1 text-lg normal-case tracking-normal">30-day sales</h3></div><span className="text-xs text-muted-foreground">{days.length} days</span></div><div className="mt-7 flex h-52 items-end gap-1.5 border-b border-border sm:gap-2">{days.map((day) => <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${dateLabel(day.date)} · ${money(day.sales)} · ${day.orders} orders`}><div className="w-full bg-foreground/75 transition-colors group-hover:bg-foreground" style={{ height: `${Math.max(2, (Number(day.sales) / peak) * 100)}%` }} /></div>)}</div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{days[0] ? dateLabel(days[0].date) : ""}</span><span>{days.length ? dateLabel(days[days.length - 1].date) : ""}</span></div></section><section className="mt-6 border border-border bg-card"><div className="border-b border-border px-5 py-4"><p className="eyebrow">Best performing</p><h3 className="mt-1 text-lg normal-case tracking-normal">Top products</h3></div>{top.length ? <TableWrap><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Units sold</th><th className="px-5 py-3">Revenue</th></tr></thead><tbody className="divide-y divide-border">{top.map((product, index) => <tr key={product.product_id ?? `${product.name}-${index}`}><td className="px-5 py-3 font-semibold">{product.name}</td><td className="px-5 py-3">{product.units_sold}</td><td className="px-5 py-3">{money(product.revenue)}</td></tr>)}</tbody></table></TableWrap> : <EmptyTable>Sales and product rankings will appear when orders are placed.</EmptyTable>}</section></>}</>;
}

function WebsiteSection({ value, loading, refresh }: { value?: HomepageSettings; loading: boolean; refresh: () => Promise<void> }) {
  const save = useServerFn(saveAdminHomepage); const [busy, setBusy] = useState(false); const homepage = value?.homepage;
  const [draft, setDraft] = useState({ eyebrow: "", headline: "", body: "", image_path: "", button_label: "", button_href: "/shop", active: true });
  useEffect(() => { if (homepage) setDraft({ eyebrow: homepage.eyebrow, headline: homepage.headline, body: homepage.body, image_path: homepage.image_path, button_label: homepage.button_label, button_href: homepage.button_href, active: homepage.active }); }, [homepage]);
  async function upload(file?: File) { if (!file) return; if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { toast.error("Choose an image smaller than 10 MB."); return; } const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type }); if (error) toast.error(error.message); else setDraft((prev) => ({ ...prev, image_path: path })); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); try { await save({ data: draft }); toast.success("Homepage banner saved"); await refresh(); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not save homepage content"); } finally { setBusy(false); } }
  return <><PageIntro eyebrow="Storefront" title="Website content" />{loading ? <LoadingLine /> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><form onSubmit={(event) => void submit(event)} className="space-y-5 border border-border bg-card p-5 md:p-7"><div><p className="eyebrow">Homepage banner</p><p className="mt-1 text-sm text-muted-foreground">The published home page reads these banner details.</p></div><Field label="Eyebrow"><Input value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} /></Field><Field label="Headline"><Input required value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} /></Field><Field label="Description"><Textarea rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field><Field label="Button label"><Input required value={draft.button_label} onChange={(e) => setDraft({ ...draft, button_label: e.target.value })} /></Field><Field label="Button destination"><Input required value={draft.button_href} onChange={(e) => setDraft({ ...draft, button_href: e.target.value })} /></Field><Field label="Banner image path"><Input required value={draft.image_path} onChange={(e) => setDraft({ ...draft, image_path: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.active} onCheckedChange={(checked) => setDraft({ ...draft, active: checked === true })} />Publish banner</label><div><Label className="eyebrow">Upload replacement banner</Label><Input className="mt-2" type="file" accept="image/*" onChange={(e) => void upload(e.target.files?.[0])} /></div><Button disabled={busy}>{busy ? "Saving…" : "Save banner"}</Button></form><aside className="border border-border bg-card p-5"><p className="eyebrow">Preview</p>{(value?.homepage?.imageUrl ?? draft.image_path) && <div className="mt-4 aspect-[4/5] overflow-hidden bg-muted md:aspect-[4/3]"><img src={draft.image_path === homepage?.image_path ? homepage?.imageUrl ?? draft.image_path : draft.image_path.startsWith("/") || draft.image_path.startsWith("http") ? draft.image_path : supabase.storage.from("product-images").getPublicUrl(draft.image_path).data.publicUrl} alt="Banner preview" className="size-full object-cover" /></div>}<p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{draft.eyebrow}</p><p className="mt-1 text-xl font-extrabold uppercase">{draft.headline}</p><p className="mt-2 text-sm text-muted-foreground">{draft.body}</p></aside></div>}</>;
}

function SettingsSection({ value, loading, refresh }: { value?: HomepageSettings; loading: boolean; refresh: () => Promise<void> }) {
  const save = useServerFn(saveAdminSettings); const [busy, setBusy] = useState(false); const [name, setName] = useState(""); const [threshold, setThreshold] = useState("5");
  useEffect(() => { if (value?.settings) { setName(value.settings.store_name); setThreshold(String(value.settings.low_stock_threshold)); } }, [value?.settings]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); try { await save({ data: { store_name: name, low_stock_threshold: Number(threshold) } }); toast.success("Store settings saved"); await refresh(); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not save settings"); } finally { setBusy(false); } }
  return <><PageIntro eyebrow="Store configuration" title="Settings" />{loading ? <LoadingLine /> : <form onSubmit={(event) => void submit(event)} className="max-w-2xl space-y-5 border border-border bg-card p-5 md:p-7"><div><p className="eyebrow">General</p><p className="mt-1 text-sm text-muted-foreground">Manage the store name and inventory alert level.</p></div><Field label="Store name"><Input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Low stock alert when units are at or below"><Input type="number" min="0" max="10000" required value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field><Button disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button></form>}</>;
}

function StatusPill({ status }: { status: string }) {
  const cancelled = status === "cancelled" || status === "inactive";
  const complete = status === "delivered" || status === "active";
  return <span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${cancelled ? "border-border text-muted-foreground" : complete ? "border-foreground/30 bg-secondary text-foreground" : "border-border bg-background text-foreground"}`}>{statusLabel(status)}</span>;
}
function statusLabel(status: string) { return status.replaceAll("_", " "); }