
CREATE TABLE public.ai_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  message_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON public.ai_daily_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS max_ai_messages_per_day integer DEFAULT 5;
