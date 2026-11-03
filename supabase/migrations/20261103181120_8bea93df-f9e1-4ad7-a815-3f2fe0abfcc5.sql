DROP POLICY IF EXISTS "Active product images are public" ON public.product_images;
CREATE POLICY "Active product images are public" ON public.product_images FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.active = true)
);
CREATE POLICY "Admins preview all product images" ON public.product_images FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
DROP POLICY IF EXISTS "Active store image reads" ON storage.objects;
CREATE POLICY "Active store image reads" ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'product-images' AND (
    EXISTS (
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
CREATE POLICY "Admins preview all store images" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
);