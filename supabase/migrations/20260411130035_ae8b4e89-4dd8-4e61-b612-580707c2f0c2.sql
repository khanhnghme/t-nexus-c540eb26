-- Thêm cột slug cho project_pages (chuẩn bị cho routing)
ALTER TABLE public.project_pages 
  ADD COLUMN IF NOT EXISTS slug text;

-- Unique slug per group
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_pages_group_slug 
  ON public.project_pages(group_id, slug) 
  WHERE slug IS NOT NULL;

-- Auto-generate slug từ title khi insert
CREATE OR REPLACE FUNCTION public.generate_page_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]', '-', 'g'));
    WHILE EXISTS (
      SELECT 1 FROM public.project_pages 
      WHERE group_id = NEW.group_id AND slug = NEW.slug AND id != NEW.id
    ) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_pages_slug
  BEFORE INSERT ON public.project_pages
  FOR EACH ROW EXECUTE FUNCTION public.generate_page_slug();