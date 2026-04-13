
CREATE OR REPLACE FUNCTION public.check_profile_login(p_email text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('is_approved', is_approved, 'full_name', full_name)
  INTO result
  FROM public.profiles
  WHERE email = p_email;
  
  RETURN result;
END;
$$;
