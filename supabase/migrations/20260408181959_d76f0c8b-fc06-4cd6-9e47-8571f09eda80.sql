
CREATE OR REPLACE FUNCTION public.track_plan_downgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only act when user_plan actually changes
  IF OLD.user_plan IS DISTINCT FROM NEW.user_plan THEN
    -- Downgraded to free from a paid plan
    IF NEW.user_plan = 'plan_free' AND OLD.user_plan IN ('plan_plus', 'plan_pro', 'plan_business', 'plan_custom') THEN
      NEW.downgraded_at := now();
    END IF;

    -- Upgraded from free to a paid plan → clear downgrade timestamp
    IF OLD.user_plan = 'plan_free' AND NEW.user_plan IN ('plan_plus', 'plan_pro', 'plan_business', 'plan_custom') THEN
      NEW.downgraded_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_plan_downgrade
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.track_plan_downgrade();
