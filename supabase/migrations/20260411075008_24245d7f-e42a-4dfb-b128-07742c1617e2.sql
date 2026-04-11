-- Add source column to personal_events
ALTER TABLE public.personal_events 
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal';

-- Add check constraint via trigger (avoid immutable CHECK issue)
CREATE OR REPLACE FUNCTION public.validate_personal_event_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source NOT IN ('internal', 'external') THEN
    RAISE EXCEPTION 'source must be internal or external';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_personal_event_source
  BEFORE INSERT OR UPDATE ON public.personal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_personal_event_source();

-- Add sync lock column to google_calendar_tokens
ALTER TABLE public.google_calendar_tokens 
  ADD COLUMN IF NOT EXISTS sync_locked_at TIMESTAMPTZ DEFAULT NULL;