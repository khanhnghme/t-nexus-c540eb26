
-- 1. is_system_owner
CREATE OR REPLACE FUNCTION public.is_system_owner(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'system:owner'
  )
$function$;

-- 2. is_system_admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('system:owner', 'system:admin')
  )
$function$;

-- 3. is_project_leader
CREATE OR REPLACE FUNCTION public.is_project_leader(_user_id uuid, _group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role IN ('project_basic:owner', 'project_basic:admin')
  )
  OR public.is_system_admin(_user_id)
$function$;

-- 4. get_workspace_role
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id uuid, _workspace_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.is_system_owner(_user_id) THEN 'workspace:owner'
    WHEN public.is_system_admin(_user_id) THEN 'workspace:admin'
    WHEN EXISTS (SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id) THEN 'workspace:owner'
    ELSE (SELECT role FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id)
  END
$function$;

-- 5. get_billing_role
CREATE OR REPLACE FUNCTION public.get_billing_role(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'system:owner')
      THEN 'billing_manager'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('system:owner','system:admin'))
      THEN (SELECT COALESCE(ur.billing_role, 'billing_viewer') FROM public.user_roles ur WHERE ur.user_id = _user_id LIMIT 1)
    ELSE NULL
  END
$function$;

-- 6. check_admin_user
CREATE OR REPLACE FUNCTION public.check_admin_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _admin_email text;
BEGIN
  SELECT (value->>'email') INTO _admin_email FROM public.system_settings WHERE key = 'admin_contact';
  IF _admin_email IS NULL OR _admin_email = '' THEN RETURN NEW; END IF;
  IF NEW.email = _admin_email THEN
    UPDATE public.profiles SET is_approved = true, email = NEW.email WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'system:owner') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
