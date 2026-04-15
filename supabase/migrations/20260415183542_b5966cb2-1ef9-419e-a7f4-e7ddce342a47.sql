
ALTER TABLE public.workspaces 
  ADD COLUMN share_ai_credits boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_user_ai_credit_usage_month(
  _user_id uuid, _month_start date, _month_end date
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    CEIL(SUM(token_count)::numeric / 1000)::integer, 0
  )
  FROM public.ai_daily_usage
  WHERE user_id = _user_id
    AND usage_date >= _month_start
    AND usage_date <= _month_end;
$$;
