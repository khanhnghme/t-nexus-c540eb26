ALTER TABLE public.groups ADD COLUMN idempotency_key uuid;
CREATE UNIQUE INDEX idx_groups_idempotency_key ON public.groups(idempotency_key) WHERE idempotency_key IS NOT NULL;