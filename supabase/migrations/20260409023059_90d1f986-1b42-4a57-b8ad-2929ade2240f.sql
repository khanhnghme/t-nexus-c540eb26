ALTER TABLE public.plan_limits ADD COLUMN max_meeting_duration_minutes integer;

UPDATE public.plan_limits SET max_meeting_duration_minutes = 15 WHERE plan = 'plan_free';
UPDATE public.plan_limits SET max_meeting_duration_minutes = 60 WHERE plan = 'plan_plus';
