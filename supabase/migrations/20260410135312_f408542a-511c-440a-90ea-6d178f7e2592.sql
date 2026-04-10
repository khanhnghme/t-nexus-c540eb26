-- Add idempotency flags to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS addons_applied boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_applied boolean DEFAULT false;

-- Enable pg_cron and pg_net for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule cleanup of stale pending orders every hour
SELECT cron.schedule(
  'cleanup-pending-orders',
  '0 * * * *',
  $$
  UPDATE public.orders 
  SET status = 'expired' 
  WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '2 hours';
  $$
);