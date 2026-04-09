-- Change groups.workspace_id FK to CASCADE on delete
ALTER TABLE public.groups
  DROP CONSTRAINT groups_workspace_id_fkey;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE CASCADE;
