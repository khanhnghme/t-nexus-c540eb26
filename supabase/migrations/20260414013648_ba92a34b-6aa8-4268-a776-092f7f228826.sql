CREATE OR REPLACE FUNCTION public.get_workspace_ai_usage_today(_workspace_id uuid, _date date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(adu.message_count), 0)::integer
  FROM ai_daily_usage adu
  WHERE adu.usage_date = _date
    AND adu.user_id IN (
      -- workspace owner
      SELECT w.owner_id FROM workspaces w WHERE w.id = _workspace_id
      UNION
      -- workspace members
      SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = _workspace_id
    )
$$;