-- Remove unauthenticated, caller-unbound read rules on the private product-images bucket.
-- Public pages receive images via server-created signed URLs (service role), and admin
-- previews/uploads are covered by the existing admin-only policies.
DROP POLICY IF EXISTS "Product images public read" ON storage.objects;
DROP POLICY IF EXISTS "Active store image reads" ON storage.objects;

-- Keep the bucket private: no anon/authenticated read policy remains.
-- Remaining policies are admin-only and bound to has_role(auth.uid(), 'admin').