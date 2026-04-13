CREATE POLICY "workspace_select_project_guest"
ON public.workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = auth.uid()
      AND g.workspace_id = workspaces.id
  )
);