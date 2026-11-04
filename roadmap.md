# Work checklist

- [x] Implement approved, minimal Supabase changes for size inventory, homepage banner, store settings, analytics and private image access.
- [x] Rename existing brand presentation to Avenuenest Clothing without changing customer checkout/order behavior.
- [x] Build responsive, functional admin overview and management areas backed by authorized Supabase data.
- [x] Complete the remaining brand, storefront data, responsive, permission, storage and build verification in this pass.

## Verification notes
- Build and typecheck pass after fixing the admin.tsx JSX syntax error (stray closing brace).
- Homepage and /shop render with zero broken images and no page errors; signed-out /admin redirects to /auth; non-admins see the "Access unavailable" screen via the admin route's errorComponent.
- Authenticated admin data operations (product/order editing as a signed-in admin) remain unverified because this project uses an external Supabase project and no session can be minted here; user should exercise them in the preview signed in as an admin.
