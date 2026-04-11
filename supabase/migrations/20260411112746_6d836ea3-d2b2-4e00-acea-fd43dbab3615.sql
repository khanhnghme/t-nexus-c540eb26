
-- Add project_mode to groups
ALTER TABLE public.groups ADD COLUMN project_mode text NOT NULL DEFAULT 'basic';

-- Create project_pages table
CREATE TABLE public.project_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by group
CREATE INDEX idx_project_pages_group_id ON public.project_pages(group_id);

-- Enable RLS
ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;

-- SELECT: project members can view pages
CREATE POLICY "Members can view project pages"
ON public.project_pages
FOR SELECT
TO authenticated
USING (is_group_member(auth.uid(), group_id));

-- INSERT: project leaders can create pages
CREATE POLICY "Leaders can create project pages"
ON public.project_pages
FOR INSERT
TO authenticated
WITH CHECK (is_group_leader(auth.uid(), group_id));

-- UPDATE: project leaders can update pages
CREATE POLICY "Leaders can update project pages"
ON public.project_pages
FOR UPDATE
TO authenticated
USING (is_group_leader(auth.uid(), group_id));

-- DELETE: project leaders can delete pages
CREATE POLICY "Leaders can delete project pages"
ON public.project_pages
FOR DELETE
TO authenticated
USING (is_group_leader(auth.uid(), group_id));

-- Auto-update updated_at trigger
CREATE TRIGGER update_project_pages_updated_at
BEFORE UPDATE ON public.project_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
