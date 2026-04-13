
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT json_build_object(
      'id', id,
      'full_name', full_name,
      'avatar_url', avatar_url,
      'email', email
    )
    FROM public.profiles
    WHERE email = lower(trim(p_email))
    LIMIT 1
  );
END;
$$;
