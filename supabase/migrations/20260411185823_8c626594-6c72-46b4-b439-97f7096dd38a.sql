
-- Add short_id column
ALTER TABLE public.workspaces ADD COLUMN short_id text;

-- Generate unique 8-char alphanumeric short_id for existing workspaces
UPDATE public.workspaces SET short_id = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- Make it NOT NULL after populating
ALTER TABLE public.workspaces ALTER COLUMN short_id SET NOT NULL;

-- Unique index
CREATE UNIQUE INDEX idx_workspaces_short_id ON public.workspaces(short_id);

-- Auto-generate on insert
CREATE OR REPLACE FUNCTION public.generate_workspace_short_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workspace_short_id
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.generate_workspace_short_id();
