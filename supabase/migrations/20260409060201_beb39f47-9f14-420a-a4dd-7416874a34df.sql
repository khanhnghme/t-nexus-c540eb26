
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  applicable_plans text[] DEFAULT '{}',
  min_plan text,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
