
-- Create project_templates table
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- System templates visible to all authenticated users
CREATE POLICY "Anyone can view system templates"
  ON public.project_templates FOR SELECT TO authenticated
  USING (is_system = true);

-- Workspace templates visible to workspace participants
CREATE POLICY "Workspace members can view workspace templates"
  ON public.project_templates FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL 
    AND public.is_workspace_participant(auth.uid(), workspace_id)
  );

-- Creator can manage own templates
CREATE POLICY "Users can manage own templates"
  ON public.project_templates FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
