
CREATE OR REPLACE FUNCTION public.get_workspace_ai_credit_usage_month(
  _workspace_id uuid, _month_start date, _month_end date
) RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(CEIL(SUM(adu.token_count)::numeric / 1000), 0)::integer
  FROM ai_daily_usage adu
  WHERE adu.usage_date >= _month_start
    AND adu.usage_date <= _month_end
    AND adu.user_id IN (
      SELECT w.owner_id FROM workspaces w WHERE w.id = _workspace_id
      UNION
      SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = _workspace_id
    )
$$;
