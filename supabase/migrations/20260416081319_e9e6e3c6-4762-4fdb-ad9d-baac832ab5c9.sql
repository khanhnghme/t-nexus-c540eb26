CREATE POLICY "Workspace participants can view workspace projects"
ON public.groups FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.is_workspace_participant(auth.uid(), workspace_id)
);