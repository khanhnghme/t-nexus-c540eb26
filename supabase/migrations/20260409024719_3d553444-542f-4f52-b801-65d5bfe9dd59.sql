ALTER TABLE public.plan_limits ADD COLUMN max_activity_log_days integer;

UPDATE public.plan_limits SET max_activity_log_days = 0 WHERE plan = 'plan_free';
UPDATE public.plan_limits SET max_activity_log_days = 30 WHERE plan = 'plan_plus';
-- Pro, Business, Custom remain NULL = unlimited