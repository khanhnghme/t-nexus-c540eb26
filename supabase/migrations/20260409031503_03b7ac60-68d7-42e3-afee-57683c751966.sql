
-- Create user_addons table
CREATE TABLE public.user_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type text NOT NULL CHECK (addon_type IN ('projects', 'storage', 'members')),
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, addon_type)
);

ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own addons" ON public.user_addons
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own addons" ON public.user_addons
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own addons" ON public.user_addons
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own addons" ON public.user_addons
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_addons_updated_at
  BEFORE UPDATE ON public.user_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get addon bonuses for an owner
CREATE OR REPLACE FUNCTION public.get_owner_addon_bonus(_owner_id uuid)
RETURNS TABLE(bonus_projects integer, bonus_storage_mb integer, bonus_members integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN addon_type = 'projects' THEN quantity * 5 ELSE 0 END), 0)::integer AS bonus_projects,
    COALESCE(SUM(CASE WHEN addon_type = 'storage' THEN quantity * 5 * 1024 ELSE 0 END), 0)::integer AS bonus_storage_mb,
    COALESCE(SUM(CASE WHEN addon_type = 'members' THEN quantity * 5 ELSE 0 END), 0)::integer AS bonus_members
  FROM public.user_addons
  WHERE user_id = _owner_id;
$$;
