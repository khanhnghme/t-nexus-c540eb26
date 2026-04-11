
-- Group members (any role) can view pages of their groups
CREATE POLICY "Group members can view pages"
  ON public.project_pages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
  ));

-- Group leaders can insert/update/delete pages
CREATE POLICY "Group leaders can manage pages"
  ON public.project_pages FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('project_owner', 'project_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('project_owner', 'project_admin')
  ));
