CREATE TABLE IF NOT EXISTS public.user_permission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_role public.app_role NOT NULL,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_permission_profiles_base_role_check
    CHECK (base_role IN ('org_master'::public.app_role, 'unit_master'::public.app_role, 'unit_user'::public.app_role)),
  CONSTRAINT user_permission_profiles_name_not_blank
    CHECK (length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_permission_profiles_org_lower_name_key
  ON public.user_permission_profiles (org_id, lower(name));

CREATE TABLE IF NOT EXISTS public.user_permission_profile_permissions (
  profile_id uuid NOT NULL REFERENCES public.user_permission_profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, permission_key),
  CONSTRAINT user_permission_profile_permissions_key_not_blank
    CHECK (length(btrim(permission_key)) > 0)
);

CREATE TABLE IF NOT EXISTS public.user_permission_profile_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.user_permission_profiles(id) ON DELETE CASCADE,
  assigned_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_permission_profile_assignments_unique_user_org
    UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_permission_profiles_org_role_idx
  ON public.user_permission_profiles (org_id, base_role);

CREATE INDEX IF NOT EXISTS user_permission_profile_assignments_profile_idx
  ON public.user_permission_profile_assignments (profile_id);

ALTER TABLE public.user_permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_profile_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_profile_assignments ENABLE ROW LEVEL SECURITY;
