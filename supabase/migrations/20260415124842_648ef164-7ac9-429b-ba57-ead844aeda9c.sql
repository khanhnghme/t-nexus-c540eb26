
-- Starred projects
CREATE TABLE public.starred_projects (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);
ALTER TABLE public.starred_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stars"
  ON public.starred_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Recent access tracking
CREATE TABLE public.project_access_log (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);
ALTER TABLE public.project_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own access log"
  ON public.project_access_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
