-- 1. System admins can view all project pages
CREATE POLICY "System admins can view all project pages"
  ON public.project_pages FOR SELECT
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

-- 2. Public groups: anonymous users can view pages
CREATE POLICY "Public can view pages of public groups"
  ON public.project_pages FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = project_pages.group_id
      AND g.is_public = true
  ));

-- 3. System admins can manage all project pages
CREATE POLICY "System admins can manage project pages"
  ON public.project_pages FOR ALL
  TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));