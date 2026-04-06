-- Backfill profiles.full_name from auth.users metadata for rows where it is null.
-- handle_new_user uses raw_user_meta_data->>'name' (Google OAuth / magic-link),
-- but users created via invite or other flows may have their name only in
-- raw_user_meta_data->>'full_name' or not at all.
UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(TRIM(au.raw_user_meta_data->>'name'), ''),
  NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), '')
)
FROM auth.users au
WHERE p.id = au.id
  AND (p.full_name IS NULL OR TRIM(p.full_name) = '');

-- Fix handle_new_user to try both 'name' and 'full_name' keys.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
      NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), '')
    )
  );
  RETURN new;
END;
$$;
