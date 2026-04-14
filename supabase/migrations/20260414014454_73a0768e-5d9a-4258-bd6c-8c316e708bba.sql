-- Rename column
ALTER TABLE public.plan_limits RENAME COLUMN max_ai_messages_per_day TO max_ai_messages_per_month;

-- Update values
UPDATE public.plan_limits SET max_ai_messages_per_month = 30 WHERE plan = 'plan_free';
UPDATE public.plan_limits SET max_ai_messages_per_month = 100 WHERE plan = 'plan_plus';
UPDATE public.plan_limits SET max_ai_messages_per_month = 250 WHERE plan = 'plan_pro';
UPDATE public.plan_limits SET max_ai_messages_per_month = 500 WHERE plan = 'plan_business';
UPDATE public.plan_limits SET max_ai_messages_per_month = NULL WHERE plan = 'plan_custom';

-- Monthly RPC for owner aggregate usage
CREATE OR REPLACE FUNCTION public.get_owner_ai_usage_month(_owner_id uuid, _month_start date, _month_end date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(adu.message_count), 0)::integer
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

-- Monthly RPC for per-workspace usage
CREATE OR REPLACE FUNCTION public.get_workspace_ai_usage_month(_workspace_id uuid, _month_start date, _month_end date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(adu.message_count), 0)::integer
  FROM ai_daily_usage adu
  WHERE adu.usage_date >= _month_start
    AND adu.usage_date <= _month_end
    AND adu.user_id IN (
      SELECT w.owner_id FROM workspaces w WHERE w.id = _workspace_id
      UNION
      SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = _workspace_id
    )
$$;