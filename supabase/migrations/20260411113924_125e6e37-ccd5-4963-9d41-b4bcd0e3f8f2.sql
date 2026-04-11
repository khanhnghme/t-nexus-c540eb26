
-- Add icon column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'project_pages' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.project_pages ADD COLUMN icon TEXT DEFAULT NULL;
  END IF;
END $$;
