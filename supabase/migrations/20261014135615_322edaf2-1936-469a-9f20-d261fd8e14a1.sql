DROP FUNCTION IF EXISTS public.admin_update_order_status(uuid, text);
CREATE FUNCTION public.admin_update_order_status(_admin_user_id uuid, _order_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  order_item public.order_items%ROWTYPE;
  product_row public.products%ROWTYPE;
BEGIN
  IF _admin_user_id IS NULL OR NOT public.has_role(_admin_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;
  SELECT * INTO order_row FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF order_row.status = 'cancelled' AND _status <> 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled order cannot be reopened';
  END IF;
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
REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, uuid, text) TO service_role;

DROP FUNCTION IF EXISTS public.get_admin_analytics();
CREATE FUNCTION public.get_admin_analytics(_admin_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  threshold integer := 5;
  result jsonb;
BEGIN
  IF _admin_user_id IS NULL OR NOT public.has_role(_admin_user_id, 'admin'::public.app_role) THEN
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
REVOKE ALL ON FUNCTION public.get_admin_analytics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(uuid) TO service_role;