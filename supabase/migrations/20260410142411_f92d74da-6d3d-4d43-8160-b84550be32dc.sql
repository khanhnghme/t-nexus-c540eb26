ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.orders SET expires_at = created_at + interval '2 hours' WHERE expires_at IS NULL;