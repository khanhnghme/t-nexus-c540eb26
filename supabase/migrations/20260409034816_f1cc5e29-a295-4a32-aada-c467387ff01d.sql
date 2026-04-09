-- 1. Extend profiles table with billing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_source text NOT NULL DEFAULT 'self_paid';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_started_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

-- 2. Create plan_change_logs table
CREATE TABLE public.plan_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  old_plan text,
  new_plan text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  change_source text NOT NULL DEFAULT 'admin_manual',
  reason text,
  internal_note text,
  effective_mode text NOT NULL DEFAULT 'immediate',
  performed_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view plan change logs"
  ON public.plan_change_logs FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "System admins can insert plan change logs"
  ON public.plan_change_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

-- 3. Create admin_notes table
CREATE TABLE public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage admin notes"
  ON public.admin_notes FOR ALL TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

-- 4. Create payment_history table
CREATE TABLE public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id text,
  order_id text,
  invoice_id text,
  plan_purchased text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  original_amount numeric(10,2),
  discount_amount numeric(10,2) DEFAULT 0,
  final_amount numeric(10,2),
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  coupon_code text,
  description text,
  system_note text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view payment history"
  ON public.payment_history FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "System admins can insert payment history"
  ON public.payment_history FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));