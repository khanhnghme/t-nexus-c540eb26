
-- Replace trigger function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.generate_page_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title) THEN
    NEW.slug := public.generate_vietnamese_slug(NEW.title);
    -- Handle duplicates within same group
    IF EXISTS (
      SELECT 1 FROM public.project_pages 
      WHERE group_id = NEW.group_id AND slug = NEW.slug AND id != NEW.id
    ) THEN
      NEW.slug := NEW.slug || '-' || substr(NEW.id::text, 1, 4);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_project_pages_slug ON public.project_pages;
CREATE TRIGGER trg_project_pages_slug
  BEFORE INSERT OR UPDATE ON public.project_pages
  FOR EACH ROW EXECUTE FUNCTION public.generate_page_slug();
