ALTER TABLE public.products ADD COLUMN stock_by_size jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.homepage_content (
  id text PRIMARY KEY DEFAULT 'primary',
  image_path text NOT NULL,
  eyebrow text NOT NULL,
  headline text NOT NULL,
  body text NOT NULL,
  button_label text NOT NULL,
  button_href text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_content TO authenticated;
GRANT ALL ON public.homepage_content TO service_role;
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active homepage content is public" ON public.homepage_content FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage homepage content" ON public.homepage_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER homepage_content_updated_at BEFORE UPDATE ON public.homepage_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.homepage_content (id, image_path, eyebrow, headline, body, button_label, button_href, active)
VALUES ('primary', '/img/avenue-nest-campaign-banner.jpg', 'Autumn Edit — 2026', 'Dressed in shadow', 'A strict black, white and charcoal wardrobe for men who prefer fewer, better pieces. Cut clean, finished properly, delivered to your door.', 'Shop the edit', '/shop', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.store_settings (
  id text PRIMARY KEY DEFAULT 'primary',
  store_name text NOT NULL DEFAULT 'Avenuenest Clothing',
  low_stock_threshold integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage store settings" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.store_settings (id, store_name, low_stock_threshold)
VALUES ('primary', 'Avenuenest Clothing', 5)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_product_stock_by_size()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  stock_entry record;
  stock_value integer;
  stock_total bigint := 0;
BEGIN
  IF NEW.stock_by_size IS NULL OR jsonb_typeof(NEW.stock_by_size) <> 'object' THEN
    RAISE EXCEPTION 'Size stock must be an object';
  END IF;
  IF NEW.stock_by_size = '{}'::jsonb THEN
    RETURN NEW;
  END IF;
  FOR stock_entry IN SELECT key, value FROM jsonb_each_text(NEW.stock_by_size) LOOP
    IF stock_entry.key = '' OR stock_entry.value !~ '^[0-9]{1,9}$' THEN
      RAISE EXCEPTION 'Each size needs a non-negative whole-number stock quantity';
    END IF;
    IF NOT (NEW.sizes @> ARRAY[stock_entry.key]::text[]) THEN
      RAISE EXCEPTION 'Size stock must only include sizes enabled for the product';
    END IF;
    stock_value := stock_entry.value::integer;
    stock_total := stock_total + stock_value;
  END LOOP;
  IF stock_total > 2147483647 THEN
    RAISE EXCEPTION 'Combined stock exceeds the supported quantity';
  END IF;
  NEW.stock := stock_total::integer;
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_validate_size_stock BEFORE INSERT OR UPDATE OF stock_by_size, sizes ON public.products FOR EACH ROW EXECUTE FUNCTION public.validate_product_stock_by_size();

CREATE OR REPLACE FUNCTION public.place_order(
  _user_id uuid,
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _address_line1 text,
  _address_line2 text,
  _city text,
  _state text,
  _pincode text,
  _notes text,
  _items jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item jsonb;
  prod public.products%ROWTYPE;
  unit_price numeric(10,2);
  qty integer;
  calc_subtotal numeric(10,2) := 0;
  ship numeric(10,2);
  new_order public.orders%ROWTYPE;
  num text;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  IF jsonb_array_length(_items) > 30 THEN
    RAISE EXCEPTION 'Cart has too many items';
  END IF;

  FOR item IN
    SELECT jsonb_build_object('product_id', grouped.product_id, 'size', grouped.size, 'quantity', grouped.quantity)
    FROM (
      SELECT (entry->>'product_id')::uuid AS product_id, entry->>'size' AS size, sum((entry->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(_items) AS entry
      GROUP BY (entry->>'product_id')::uuid, entry->>'size'
    ) AS grouped
  LOOP
    qty := (item->>'quantity')::integer;
    IF qty IS NULL OR qty < 1 OR qty > 20 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO prod FROM public.products WHERE id = (item->>'product_id')::uuid AND active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF prod.stock_by_size <> '{}'::jsonb THEN
      IF COALESCE(item->>'size', '') = '' OR NOT (prod.stock_by_size ? (item->>'size')) THEN
        RAISE EXCEPTION 'Choose a valid size for %', prod.name;
      END IF;
      IF (prod.stock_by_size->>(item->>'size'))::integer < qty THEN
        RAISE EXCEPTION 'Not enough stock for % size %', prod.name, item->>'size';
      END IF;
    ELSIF prod.stock < qty THEN
      RAISE EXCEPTION 'Not enough stock for %', prod.name;
    END IF;
    unit_price := COALESCE(prod.sale_price, prod.price);
    calc_subtotal := calc_subtotal + unit_price * qty;
  END LOOP;

  ship := CASE WHEN calc_subtotal >= 1000 THEN 0 ELSE 100 END;
  num := 'AN' || to_char(now(), 'YYMMDD') || lpad((floor(random()*100000))::text, 5, '0');
  INSERT INTO public.orders (order_number, user_id, customer_name, customer_email, customer_phone,
    address_line1, address_line2, city, state, pincode, subtotal, shipping_fee, total, payment_method, status, notes)
  VALUES (num, _user_id, _customer_name, _customer_email, _customer_phone,
    _address_line1, _address_line2, _city, _state, _pincode, calc_subtotal, ship, calc_subtotal + ship, 'COD', 'pending', _notes)
  RETURNING * INTO new_order;

  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    qty := (item->>'quantity')::integer;
    SELECT * INTO prod FROM public.products WHERE id = (item->>'product_id')::uuid;
    unit_price := COALESCE(prod.sale_price, prod.price);
    INSERT INTO public.order_items (order_id, product_id, product_name, product_price, size, quantity)
    VALUES (new_order.id, prod.id, prod.name, unit_price, item->>'size', qty);
    IF prod.stock_by_size <> '{}'::jsonb THEN
      UPDATE public.products
      SET stock_by_size = jsonb_set(stock_by_size, ARRAY[item->>'size'], to_jsonb(((stock_by_size->>(item->>'size'))::integer - qty)), false)
      WHERE id = prod.id;
    ELSE
      UPDATE public.products SET stock = stock - qty WHERE id = prod.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_number', new_order.order_number, 'subtotal', new_order.subtotal,
    'shipping_fee', new_order.shipping_fee, 'total', new_order.total);
END;
$$;
REVOKE ALL ON FUNCTION public.place_order(uuid, text, text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, text, text, text, text, text, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  order_item public.order_items%ROWTYPE;
  product_row public.products%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;
  SELECT * INTO order_row FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF order_row.status <> 'cancelled' AND _status = 'cancelled' THEN
    FOR order_item IN SELECT * FROM public.order_items WHERE order_id = _order_id LOOP
      IF order_item.product_id IS NULL THEN CONTINUE; END IF;
      SELECT * INTO product_row FROM public.products WHERE id = order_item.product_id FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;
      IF product_row.stock_by_size <> '{}'::jsonb AND order_item.size IS NOT NULL AND product_row.stock_by_size ? order_item.size THEN
        UPDATE public.products SET stock_by_size = jsonb_set(stock_by_size, ARRAY[order_item.size], to_jsonb((stock_by_size->>order_item.size)::integer + order_item.quantity), false) WHERE id = product_row.id;
      ELSE
        UPDATE public.products SET stock = stock + order_item.quantity WHERE id = product_row.id;
      END IF;
    END LOOP;
  END IF;
  UPDATE public.orders SET status = _status WHERE id = _order_id;
  RETURN jsonb_build_object('id', _order_id, 'status', _status);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  threshold integer := 5;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT low_stock_threshold INTO threshold FROM public.store_settings WHERE id = 'primary';
  threshold := COALESCE(threshold, 5);
  SELECT jsonb_build_object(
    'order_count', (SELECT count(*) FROM public.orders),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status = 'pending'),
    'sales_total', (SELECT COALESCE(sum(total), 0) FROM public.orders WHERE status <> 'cancelled'),
    'product_count', (SELECT count(*) FROM public.products),
    'active_product_count', (SELECT count(*) FROM public.products WHERE active),
    'low_stock_count', (SELECT count(*) FROM public.products WHERE active AND stock <= threshold),
    'sales_by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', days.day::date, 'sales', COALESCE(sums.sales, 0), 'orders', COALESCE(sums.orders, 0)) ORDER BY days.day)
      FROM generate_series(current_date - 29, current_date, interval '1 day') AS days(day)
      LEFT JOIN (
        SELECT created_at::date AS day, sum(total) AS sales, count(*) AS orders
        FROM public.orders WHERE status <> 'cancelled' AND created_at >= current_date - 29
        GROUP BY created_at::date
      ) AS sums ON sums.day = days.day::date
    ), '[]'::jsonb),
    'top_products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product_id', ranked.product_id, 'name', ranked.name, 'units_sold', ranked.units_sold, 'revenue', ranked.revenue) ORDER BY ranked.units_sold DESC)
      FROM (
        SELECT oi.product_id, oi.product_name AS name, sum(oi.quantity)::bigint AS units_sold, sum(oi.quantity * oi.product_price) AS revenue
        FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
        WHERE o.status <> 'cancelled'
        GROUP BY oi.product_id, oi.product_name ORDER BY sum(oi.quantity) DESC LIMIT 5
      ) AS ranked
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;

DROP POLICY IF EXISTS "Product images are public" ON public.product_images;
CREATE POLICY "Active product images are public" ON public.product_images FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.active = true)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

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
CREATE POLICY "Admins upload store images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
CREATE POLICY "Admins update store images" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
) WITH CHECK (
  bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
CREATE POLICY "Admins delete store images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
);