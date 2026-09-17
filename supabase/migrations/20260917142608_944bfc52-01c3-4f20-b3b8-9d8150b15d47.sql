-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image text,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active categories are public" ON public.categories FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  discount_percent integer NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 90),
  sale_price numeric(10,2),
  sizes text[] NOT NULL DEFAULT '{}',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku text UNIQUE,
  featured boolean NOT NULL DEFAULT false,
  bestseller boolean NOT NULL DEFAULT false,
  new_arrival boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(active);
CREATE INDEX idx_products_flags ON public.products(featured, bestseller, new_arrival);

-- Product images
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images are public" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_product_images_product ON public.product_images(product_id, display_order);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  shipping_fee numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'COD',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orders read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_price numeric(10,2) NOT NULL,
  size text,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own order items read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Secure order placement: validates prices/stock server-side
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
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    qty := (item->>'quantity')::int;
    IF qty IS NULL OR qty < 1 OR qty > 20 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO prod FROM public.products WHERE id = (item->>'product_id')::uuid AND active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF prod.stock < qty THEN RAISE EXCEPTION 'Not enough stock for %', prod.name; END IF;
    unit_price := COALESCE(prod.sale_price, prod.price);
    calc_subtotal := calc_subtotal + unit_price * qty;
  END LOOP;

  ship := CASE WHEN calc_subtotal >= 1000 THEN 0 ELSE 100 END;
  num := 'MC' || to_char(now(), 'YYMMDD') || lpad((floor(random()*100000))::text, 5, '0');

  INSERT INTO public.orders (order_number, user_id, customer_name, customer_email, customer_phone,
    address_line1, address_line2, city, state, pincode, subtotal, shipping_fee, total, payment_method, status, notes)
  VALUES (num, _user_id, _customer_name, _customer_email, _customer_phone,
    _address_line1, _address_line2, _city, _state, _pincode, calc_subtotal, ship, calc_subtotal + ship, 'COD', 'pending', _notes)
  RETURNING * INTO new_order;

  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    qty := (item->>'quantity')::int;
    SELECT * INTO prod FROM public.products WHERE id = (item->>'product_id')::uuid;
    unit_price := COALESCE(prod.sale_price, prod.price);
    INSERT INTO public.order_items (order_id, product_id, product_name, product_price, size, quantity)
    VALUES (new_order.id, prod.id, prod.name, unit_price, item->>'size', qty);
    UPDATE public.products SET stock = stock - qty WHERE id = prod.id;
  END LOOP;

  RETURN jsonb_build_object(
    'order_number', new_order.order_number,
    'subtotal', new_order.subtotal,
    'shipping_fee', new_order.shipping_fee,
    'total', new_order.total
  );
END; $$;

REVOKE ALL ON FUNCTION public.place_order(uuid,text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid,text,text,text,text,text,text,text,text,text,jsonb) TO service_role;

-- Storage policies for product images
CREATE POLICY "Product images public read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));