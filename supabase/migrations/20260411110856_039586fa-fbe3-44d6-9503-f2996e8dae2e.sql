ALTER TABLE public.workspaces ADD COLUMN idempotency_key uuid;
CREATE UNIQUE INDEX idx_workspaces_idempotency_key ON public.workspaces(idempotency_key) WHERE idempotency_key IS NOT NULL;