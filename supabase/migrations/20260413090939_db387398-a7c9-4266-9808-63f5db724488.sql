-- 1. Drop UNIQUE constraint on student_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_student_id_key;

-- 2. Ensure default value for student_id
ALTER TABLE public.profiles ALTER COLUMN student_id SET DEFAULT '';

-- 3. Drop the lookup function (no longer needed for login)
DROP FUNCTION IF EXISTS public.get_email_by_student_id(text);