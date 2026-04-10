
-- Step 1: Delete duplicate calendar_sync_map rows (keep oldest per user_id + google_event_id)
DELETE FROM public.calendar_sync_map
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, google_event_id) id
  FROM public.calendar_sync_map
  ORDER BY user_id, google_event_id, last_synced_at ASC
);

-- Step 2: Delete duplicate calendar_sync_map rows (keep oldest per user_id + local_event_id + local_event_type)
DELETE FROM public.calendar_sync_map
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, local_event_id, local_event_type) id
  FROM public.calendar_sync_map
  ORDER BY user_id, local_event_id, local_event_type, last_synced_at ASC
);

-- Step 3: Delete orphaned duplicate personal_events
-- Events that have the same user_id, title, start_time but multiple copies — keep only the one referenced in sync_map
DELETE FROM public.personal_events pe
WHERE pe.id NOT IN (
  SELECT csm.local_event_id FROM public.calendar_sync_map csm WHERE csm.local_event_type = 'personal'
)
AND EXISTS (
  SELECT 1 FROM public.personal_events pe2
  JOIN public.calendar_sync_map csm2 ON csm2.local_event_id = pe2.id AND csm2.local_event_type = 'personal'
  WHERE pe2.user_id = pe.user_id
    AND pe2.title = pe.title
    AND pe2.start_time = pe.start_time
    AND pe2.id != pe.id
);

-- Step 4: Add unique constraints
ALTER TABLE public.calendar_sync_map
  ADD CONSTRAINT uq_sync_map_local UNIQUE (user_id, local_event_id, local_event_type);

ALTER TABLE public.calendar_sync_map
  ADD CONSTRAINT uq_sync_map_google UNIQUE (user_id, google_event_id);
