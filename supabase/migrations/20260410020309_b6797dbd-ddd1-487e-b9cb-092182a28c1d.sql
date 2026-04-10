ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS next_plan text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_billing_cycle text DEFAULT NULL;