
-- Add order_type column to orders table
ALTER TABLE public.orders
ADD COLUMN order_type text NOT NULL DEFAULT 'plan';

-- Make plan column nullable for addon-only orders
ALTER TABLE public.orders
ALTER COLUMN plan DROP NOT NULL;
