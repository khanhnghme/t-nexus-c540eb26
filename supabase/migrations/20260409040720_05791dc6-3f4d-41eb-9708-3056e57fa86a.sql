
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS billing_role text;

CREATE OR REPLACE FUNCTION public.get_billing_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'system_owner')
      THEN 'billing_manager'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('system_owner','system_admin'))
      THEN (SELECT COALESCE(ur.billing_role, 'billing_viewer') FROM public.user_roles ur WHERE ur.user_id = _user_id LIMIT 1)
    ELSE NULL
  END
$$;
