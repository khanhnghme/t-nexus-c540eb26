
CREATE OR REPLACE FUNCTION public.auto_create_workspace_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    ws_name TEXT;
    ws_slug TEXT;
    _max_projects INTEGER;
    _max_members INTEGER;
    _max_storage_mb INTEGER;
    _last_word TEXT;
BEGIN
    SELECT 
      COALESCE(pl.max_projects_per_workspace, 5),
      COALESCE(pl.max_members_per_workspace, 5),
      COALESCE(pl.max_storage_mb, 500)
    INTO _max_projects, _max_members, _max_storage_mb
    FROM public.plan_limits pl
    WHERE pl.plan = COALESCE(NEW.user_plan, 'plan_free');

    IF NOT FOUND THEN
      _max_projects := 5;
      _max_members := 5;
      _max_storage_mb := 500;
    END IF;

    -- Extract last word of full_name for workspace name
    IF NEW.full_name IS NOT NULL AND trim(NEW.full_name) != '' THEN
      _last_word := trim(regexp_replace(trim(NEW.full_name), '^.* ', ''));
      ws_name := _last_word || '''s Workspace';
    ELSE
      ws_name := 'My Workspace';
    END IF;
    
    ws_slug := public.generate_workspace_slug(ws_name);
    
    INSERT INTO public.workspaces (name, slug, owner_id, max_projects, max_members, max_storage_mb)
    VALUES (ws_name, ws_slug, NEW.id, _max_projects, _max_members, _max_storage_mb);
    
    RETURN NEW;
END
$function$;
