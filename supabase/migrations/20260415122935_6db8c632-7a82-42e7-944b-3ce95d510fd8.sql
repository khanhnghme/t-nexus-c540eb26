
-- 1. Create safeguard function
CREATE OR REPLACE FUNCTION public.auto_ensure_workspace_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _ws_id uuid;
BEGIN
  SELECT workspace_id INTO _ws_id FROM public.groups WHERE id = NEW.group_id;
  IF _ws_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = _ws_id AND owner_id = NEW.user_id) THEN
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (_ws_id, NEW.user_id, 'workspace:member')
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 2. Create trigger on group_members
CREATE TRIGGER trg_auto_ensure_workspace_member
  AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_ensure_workspace_member();

-- 3. Data fix: backfill missing workspace_members
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT DISTINCT g.workspace_id, gm.user_id, 'workspace:member'
FROM public.group_members gm
JOIN public.groups g ON g.id = gm.group_id
WHERE g.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = g.workspace_id AND w.owner_id = gm.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = g.workspace_id AND wm.user_id = gm.user_id
  )
ON CONFLICT (workspace_id, user_id) DO NOTHING;
