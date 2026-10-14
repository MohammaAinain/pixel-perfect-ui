# Avenuenest Clothing — existing-store admin dashboard

## Current state inspected

The connected Supabase project already has `products`, `product_images`, `categories`, `orders`, `order_items`, `profiles`, and `user_roles`, with an `admin` role, `has_role()` authorization and admin RLS policies. Checkout already calls the `place_order` database function, which checks availability and decrements total product stock. There is no admin page or Storage bucket. Stock is currently total-only; the home banner is bundled into the site.

## Build

- Rename the existing store presentation and page metadata to **Avenuenest Clothing**, preserving the storefront, existing basket, guest cash-on-delivery checkout and customer order pages.
- Add a responsive `/admin` area under the existing signed-in route guard, with a sidebar and real Supabase-backed overview, product management, inventory, orders, categories, customers, analytics, homepage content and store settings.
- Reuse existing tables and records. Product and category editing, multiple image references, status changes, customer history, and featured products use the current schema and database rules.
- Keep stock compatible with current products: add a per-size stock map while retaining the existing total stock field. Update `place_order` to validate and deduct a selected size atomically when size-specific stock is configured, while preserving total-only stock for existing products.
- Add one public, active-only homepage-content record for the editable banner and one admin-only store-settings record for low-stock alerts. Featured products remain the existing `products.featured` field.
- Add an admin-only `get_admin_analytics()` database function that returns aggregate store metrics without exposing order/customer records; it verifies the caller's admin role itself.
- Create a private `product-images` Storage bucket. Admin uploads are gated by storage policies; visitors can read only images attached to active public products, active categories or the active homepage banner. Existing `/img/...` images remain usable.
- All admin server functions validate inputs, require a signed-in user and confirm `has_role(..., 'admin')` before reading or changing admin data. Existing database RLS remains the final access boundary.

## Supabase changes proposed for approval

1. Add `products.stock_by_size` (JSON object, default empty) without removing or rewriting current total stock.
2. Add `homepage_content` for the single banner's image path, eyebrow, headline, copy, button label/link and active state; visitors may read only the active record, admins may manage it.
3. Add `store_settings` for the low-stock alert threshold; admins only may read or manage it.
4. Replace the existing `place_order` function body to preserve legacy total-stock behavior and atomically validate/deduct size-specific stock where configured.
5. Add `get_admin_analytics()`; it returns counts/revenue/trend/top-seller aggregates only to admins.
6. Add Storage object rules for private bucket `product-images`: admin-only file management and read access only when a file is referenced by active public merchandise or homepage content.

No existing tables will be duplicated, existing records will not be deleted, and unrelated data will not be altered. Database changes will use the connected Supabase migration approval flow.

## Technical approach

- Put the admin page under the existing `/_authenticated` route tree so login remains consistent; do not change the existing auth gate.
- Use a focused admin page/component set and `src/lib/admin.functions.ts` for role-checked server operations; use Supabase Storage APIs with the new RLS policies for file uploads.
- Keep products, orders, categories and customer profiles in existing tables. Customer email lookup uses the Supabase Auth admin API only after the server verifies the caller's admin role.
- Use existing installed design-system controls, charts and icon package; add no dependencies.
- Record new module boundaries in `AGENTS.md`; keep an implementation checklist in `roadmap.md`.

## Verification

Check the generated database types after approval, test public shop pages and admin entry behavior, exercise real Supabase reads and authorized writes when an admin session is available, confirm storage upload/read restrictions, and verify build and responsive dashboard states. Do not claim authenticated admin writes were tested if the connected Supabase session cannot be used for an end-to-end check.
