DROP POLICY "Active categories are public" ON public.categories;
CREATE POLICY "Active categories are public" ON public.categories FOR SELECT USING (active = true);

DROP POLICY "Active products are public" ON public.products;
CREATE POLICY "Active products are public" ON public.products FOR SELECT USING (active = true);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;