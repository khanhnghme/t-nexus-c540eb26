
-- Add order_code column
ALTER TABLE public.orders ADD COLUMN order_code TEXT UNIQUE;

-- Function to generate order code
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT;
  i INT;
  exists_check BOOLEAN;
BEGIN
  IF NEW.order_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  LOOP
    result := 'ORD-' || to_char(COALESCE(NEW.created_at, NOW()), 'YYYYMM') || '-';
    FOR i IN 1..9 LOOP
      result := result || substr(chars, floor(random()*36)::int + 1, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_code = result) INTO exists_check;
    IF NOT exists_check THEN
      NEW.order_code := result;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

-- Trigger before insert
CREATE TRIGGER trg_generate_order_code
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_code();

-- Backfill existing orders
DO $$
DECLARE
  r RECORD;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  i INT;
  ok BOOLEAN;
BEGIN
  FOR r IN SELECT id, created_at FROM public.orders WHERE order_code IS NULL LOOP
    LOOP
      code := 'ORD-' || to_char(r.created_at, 'YYYYMM') || '-';
      FOR i IN 1..9 LOOP
        code := code || substr(chars, floor(random()*36)::int + 1, 1);
      END LOOP;
      SELECT NOT EXISTS(SELECT 1 FROM public.orders WHERE order_code = code) INTO ok;
      IF ok THEN
        UPDATE public.orders SET order_code = code WHERE id = r.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
