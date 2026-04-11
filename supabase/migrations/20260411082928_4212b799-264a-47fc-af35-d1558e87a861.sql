-- Add google_event_id column to personal_events
ALTER TABLE public.personal_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_personal_events_google_event_id ON public.personal_events (google_event_id) WHERE google_event_id IS NOT NULL;

-- Backfill google_event_id from calendar_sync_map for existing external events
UPDATE public.personal_events pe
SET google_event_id = csm.google_event_id
FROM public.calendar_sync_map csm
WHERE csm.local_event_id = pe.id
  AND csm.local_event_type = 'personal'
  AND pe.google_event_id IS NULL;