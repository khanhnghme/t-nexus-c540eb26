
-- Function to generate unique 6-character join codes
CREATE OR REPLACE FUNCTION public.generate_join_code_6()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT;
  i INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random()*36)::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE join_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- Migrate all existing join codes to new 6-character format
UPDATE public.groups 
SET join_code = public.generate_join_code_6() 
WHERE join_code IS NOT NULL;
