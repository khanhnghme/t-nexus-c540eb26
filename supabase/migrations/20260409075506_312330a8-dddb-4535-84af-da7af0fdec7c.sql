
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  base_amount numeric NOT NULL DEFAULT 0,
  addon_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  coupon_code text,
  addons jsonb DEFAULT '[]'::jsonb,
  payment_method text NOT NULL DEFAULT 'paypal',
  paypal_order_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "System admins can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_paypal_order_id ON public.orders(paypal_order_id);
