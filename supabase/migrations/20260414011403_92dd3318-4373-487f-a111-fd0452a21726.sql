
-- Function: find the workspace owner responsible for a user's billing
CREATE OR REPLACE FUNCTION public.get_user_workspace_owner(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    -- If user owns a workspace, return themselves
    (SELECT owner_id FROM public.workspaces WHERE owner_id = _user_id LIMIT 1),
    -- Otherwise find the owner of the first workspace they belong to
    (SELECT w.owner_id FROM public.workspace_members wm
     JOIN public.workspaces w ON w.id = wm.workspace_id
     WHERE wm.user_id = _user_id
     LIMIT 1),
    -- Fallback: return the user themselves
    _user_id
  )
$$;

-- Function: sum AI usage today for all members across owner's workspaces
CREATE OR REPLACE FUNCTION public.get_owner_ai_usage_today(_owner_id uuid, _date date)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(adu.message_count), 0)::integer
  FROM public.ai_daily_usage adu
  WHERE adu.usage_date = _date
    AND adu.user_id IN (
      -- Owner themselves
      SELECT _owner_id
      UNION
      -- All workspace members
      SELECT wm.user_id
      FROM public.workspace_members wm
      JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE w.owner_id = _owner_id
    )
$$;
