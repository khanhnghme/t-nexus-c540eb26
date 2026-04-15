-- 1. Add token_count to ai_daily_usage
ALTER TABLE public.ai_daily_usage
ADD COLUMN IF NOT EXISTS token_count integer NOT NULL DEFAULT 0;

-- 2. Add max_ai_credits_per_month to plan_limits
ALTER TABLE public.plan_limits
ADD COLUMN IF NOT EXISTS max_ai_credits_per_month integer;

-- 3. Set credit limits per plan
UPDATE public.plan_limits SET max_ai_credits_per_month = NULL WHERE plan = 'plan_free';
UPDATE public.plan_limits SET max_ai_credits_per_month = NULL WHERE plan = 'plan_plus';
UPDATE public.plan_limits SET max_ai_credits_per_month = 1000 WHERE plan = 'plan_pro';
UPDATE public.plan_limits SET max_ai_credits_per_month = 2500 WHERE plan = 'plan_business';
UPDATE public.plan_limits SET max_ai_credits_per_month = NULL WHERE plan = 'plan_custom';

-- 4. RPC: increment_ai_token_usage
CREATE OR REPLACE FUNCTION public.increment_ai_token_usage(_user_id uuid, _date date, _tokens integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.ai_daily_usage (user_id, usage_date, message_count, token_count, updated_at)
  VALUES (_user_id, _date, 1, _tokens, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    message_count = ai_daily_usage.message_count + 1,
    token_count = ai_daily_usage.token_count + _tokens,
    updated_at = now();
END;
$$;

-- 5. RPC: get_owner_ai_credit_usage_month (returns credits = ceil(sum(token_count)/1000))
CREATE OR REPLACE FUNCTION public.get_owner_ai_credit_usage_month(_owner_id uuid, _month_start date, _month_end date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(CEIL(SUM(adu.token_count)::numeric / 1000), 0)::integer
  FROM public.ai_daily_usage adu
  WHERE adu.usage_date >= _month_start
    AND adu.usage_date <= _month_end
    AND adu.user_id IN (
      SELECT _owner_id
      UNION
      SELECT wm.user_id
      FROM public.workspace_members wm
      JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE w.owner_id = _owner_id
    )
$$;