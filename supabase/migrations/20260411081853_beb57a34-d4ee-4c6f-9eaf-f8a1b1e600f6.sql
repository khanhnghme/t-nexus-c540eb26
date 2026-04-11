
-- Create acquire_sync_lock function
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(p_user_id UUID, p_timeout_seconds INT DEFAULT 30)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated_count INT;
BEGIN
  UPDATE google_calendar_tokens 
  SET sync_locked_at = now()
  WHERE user_id = p_user_id 
    AND (sync_locked_at IS NULL OR sync_locked_at < now() - (p_timeout_seconds || ' seconds')::interval);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

-- Create release_sync_lock function
CREATE OR REPLACE FUNCTION public.release_sync_lock(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE google_calendar_tokens SET sync_locked_at = NULL WHERE user_id = p_user_id;
END;
$$;

-- Clear all stale locks
UPDATE public.google_calendar_tokens SET sync_locked_at = NULL WHERE sync_locked_at IS NOT NULL;
