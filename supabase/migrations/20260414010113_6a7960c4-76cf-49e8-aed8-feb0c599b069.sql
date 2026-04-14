
CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user_id uuid, _date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_daily_usage (user_id, usage_date, message_count, updated_at)
  VALUES (_user_id, _date, 1, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET message_count = ai_daily_usage.message_count + 1, updated_at = now();
END;
$$;
