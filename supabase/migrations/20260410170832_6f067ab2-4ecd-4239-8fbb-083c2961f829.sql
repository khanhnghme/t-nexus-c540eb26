
-- Create paypal_plans table
CREATE TABLE public.paypal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  billing_cycle text NOT NULL,
  paypal_product_id text NOT NULL,
  paypal_plan_id text NOT NULL,
  is_welcome boolean DEFAULT false,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_key, billing_cycle, is_welcome)
);

ALTER TABLE public.paypal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read paypal_plans"
  ON public.paypal_plans FOR SELECT
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Only admins can manage paypal_plans"
  ON public.paypal_plans FOR ALL
  TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paypal_subscription_id text,
  ADD COLUMN IF NOT EXISTS paypal_plan_id text;

-- Add column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paypal_subscription_id text;
