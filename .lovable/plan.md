# Modish Clothing — premium men's fashion store

A full store: browse, cart, cash-on-delivery checkout, order tracking, and an owner dashboard. Black / white / charcoal, bold type, lots of whitespace, mobile-first.

## Pages

- Home — hero, featured, new arrivals, bestsellers, category tiles
- Shop — search, category filter, sort, stock badges, empty/loading states
- Product details — image gallery, size picker, stock check, add to cart
- Cart — quantities, live totals, shipping rule
- Checkout — guest or logged in, delivery details, COD only
- Order success — order number + summary (works for guests)
- My Orders — signed-in customers see only their own
- Login / Signup — email + password, always optional
- About, Contact, Policies
- Admin dashboard — products, categories, images, orders

## Shipping rule

₹100 shipping below ₹1000 subtotal, free at ₹1000 and above. Subtotal, shipping and total shown at every step.

## Database changes (please approve)

Tables to create:

- `profiles` — user_id, name, phone, role (customer/admin)
- `categories` — name, slug, image, active
- `products` — name, description, category, price, discount, sale price, sizes, stock, SKU, featured, bestseller, new arrival, active
- `product_images` — product, image path, display order
- `orders` — order number, optional user, customer details, delivery address, subtotal, shipping fee, total, payment method (COD), status, timestamps
- `order_items` — order, product, name/price snapshot, size, quantity

Also: an `app_role` type plus a `user_roles` table so admin rights live in their own table (safer than a role column anyone could edit), foreign keys and indexes on category/slug/order lookups, and a `product-images` storage bucket — public to read, admin-only to upload.

Access rules: anyone can view active products, categories and images. Customers can read and edit only their own profile and only see their own orders. Guests can place COD orders but cannot read orders back except through the confirmation returned at checkout. Only admins can change products, categories, images or order status.

Seed data: the five categories (Shirts, T-Shirts, Oversized T-Shirts, Pants, Jeans) plus a starter set of real product rows so the shop is not empty on first load. No hardcoded products in the code — everything reads from the database.

## Technical notes

- Order placement goes through a server-side function that re-checks price and stock from the database, decrements stock atomically, and generates the order number; the browser never sets totals.
- Admin checks use a security-definer `has_role()` function, never client state.
- Cart persists in browser storage for guests and signed-in users alike.
- Admin dashboard lives under a protected route; non-admins are redirected away.
- Product imagery generated to match the brand where no photos are supplied.

## First admin account

After sign-up, tell me which email should be the admin and I will grant it.
