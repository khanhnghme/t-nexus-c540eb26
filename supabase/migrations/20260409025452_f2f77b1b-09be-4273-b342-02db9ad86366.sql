ALTER TABLE public.plan_limits ADD COLUMN can_export_data boolean NOT NULL DEFAULT false;

UPDATE public.plan_limits SET can_export_data = true WHERE plan IN ('plan_plus', 'plan_pro', 'plan_business', 'plan_custom');