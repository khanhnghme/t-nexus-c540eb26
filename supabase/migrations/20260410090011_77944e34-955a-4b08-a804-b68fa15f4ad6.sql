
-- Table: google_gmail_tokens
CREATE TABLE public.google_gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  email_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail tokens"
  ON public.google_gmail_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail tokens"
  ON public.google_gmail_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_google_gmail_tokens_updated_at
  BEFORE UPDATE ON public.google_gmail_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: gmail_messages
CREATE TABLE public.gmail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gmail_message_id text NOT NULL,
  thread_id text,
  subject text,
  snippet text,
  from_email text,
  from_name text,
  received_at timestamptz,
  is_read boolean DEFAULT false,
  labels text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gmail_message_id)
);

ALTER TABLE public.gmail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail messages"
  ON public.gmail_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_gmail_messages_user_received ON public.gmail_messages (user_id, received_at DESC);
