REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO service_role;
DROP POLICY IF EXISTS "Active store image reads" ON storage.objects;
CREATE POLICY "Active store image reads" ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'product-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.product_images i JOIN public.products p ON p.id = i.product_id
      WHERE i.image_path = storage.objects.name AND p.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.categories c WHERE c.image = storage.objects.name AND c.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.homepage_content h WHERE h.image_path = storage.objects.name AND h.active = true
    )
  )
);