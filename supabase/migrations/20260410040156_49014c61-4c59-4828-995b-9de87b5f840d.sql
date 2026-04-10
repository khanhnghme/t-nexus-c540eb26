
-- Google Calendar OAuth tokens per user
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON public.google_calendar_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tokens" ON public.google_calendar_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tokens" ON public.google_calendar_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tokens" ON public.google_calendar_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync map: local event <-> Google Calendar event
CREATE TABLE public.calendar_sync_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_event_id UUID NOT NULL,
  local_event_type TEXT NOT NULL CHECK (local_event_type IN ('task', 'personal')),
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_event_id, local_event_type)
);

ALTER TABLE public.calendar_sync_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync map" ON public.calendar_sync_map FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync map" ON public.calendar_sync_map FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sync map" ON public.calendar_sync_map FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sync map" ON public.calendar_sync_map FOR DELETE USING (auth.uid() = user_id);
