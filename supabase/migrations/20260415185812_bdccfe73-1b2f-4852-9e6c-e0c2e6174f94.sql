
-- Table for AI message file attachments
CREATE TABLE public.ai_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_message_attachments_message ON public.ai_message_attachments(message_id);

ALTER TABLE public.ai_message_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments of their own conversations
CREATE POLICY "Users can view own attachments"
ON public.ai_message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_conversations c ON c.id = m.conversation_id
    WHERE m.id = ai_message_attachments.message_id
      AND c.user_id = auth.uid()
  )
);

-- Users can insert attachments for their own messages
CREATE POLICY "Users can insert own attachments"
ON public.ai_message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_conversations c ON c.id = m.conversation_id
    WHERE m.id = ai_message_attachments.message_id
      AND c.user_id = auth.uid()
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON public.ai_message_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_conversations c ON c.id = m.conversation_id
    WHERE m.id = ai_message_attachments.message_id
      AND c.user_id = auth.uid()
  )
);

-- Function to cleanup old conversations and return file paths for R2 deletion
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_conversations(
  _user_id uuid,
  _max_conversations integer DEFAULT 10
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_ids uuid[];
  _file_paths text[];
BEGIN
  -- Find conversations to delete (oldest unpinned beyond limit)
  SELECT array_agg(id) INTO _old_ids
  FROM (
    SELECT id FROM public.ai_conversations
    WHERE user_id = _user_id AND is_pinned = false
    ORDER BY updated_at DESC
    OFFSET _max_conversations
  ) sub;

  IF _old_ids IS NULL OR array_length(_old_ids, 1) IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Collect file paths before deletion
  SELECT array_agg(a.file_path) INTO _file_paths
  FROM public.ai_message_attachments a
  JOIN public.ai_messages m ON m.id = a.message_id
  WHERE m.conversation_id = ANY(_old_ids);

  -- Delete conversations (CASCADE handles messages + attachments)
  DELETE FROM public.ai_conversations WHERE id = ANY(_old_ids);

  RETURN COALESCE(_file_paths, ARRAY[]::text[]);
END;
$$;
