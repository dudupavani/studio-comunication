-- Module: core — baseline snapshot 2026-04-04
-- Tables: orgs, units, profiles, org_members, unit_members
-- Views: org_users_view, unit_users_view

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('org_admin', 'org_master', 'unit_master', 'unit_user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLE: orgs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orgs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  created_at  timestamptz          DEFAULT now(),
  slug        text        NOT NULL,
  cnpj        text,
  phone       text,
  address     text,
  cep         text,
  city        text,
  state       text,
  CONSTRAINT orgs_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS orgs_slug_unique ON public.orgs USING btree (slug);

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orgs_select ON public.orgs;
CREATE POLICY orgs_select ON public.orgs
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_membership(auth.uid(), id)
  );

DROP POLICY IF EXISTS orgs_insert ON public.orgs;
CREATE POLICY orgs_insert ON public.orgs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin')
  );

DROP POLICY IF EXISTS orgs_update ON public.orgs;
CREATE POLICY orgs_update ON public.orgs
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_management_role(auth.uid(), id)
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_management_role(auth.uid(), id)
  );

DROP POLICY IF EXISTS orgs_delete ON public.orgs;
CREATE POLICY orgs_delete ON public.orgs
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin')
  );

-- ============================================================
-- TABLE: units
-- ============================================================

CREATE TABLE IF NOT EXISTS public.units (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL,
  name       text        NOT NULL,
  created_at timestamptz          DEFAULT now(),
  address    text,
  cnpj       text,
  phone      text,
  slug       text,
  cep        text,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_units_org ON public.units USING btree (org_id);
CREATE INDEX IF NOT EXISTS units_cnpj_idx ON public.units USING btree (cnpj);
CREATE INDEX IF NOT EXISTS units_phone_idx ON public.units USING btree (phone);
CREATE UNIQUE INDEX IF NOT EXISTS units_id_org_uq ON public.units USING btree (id, org_id);
CREATE UNIQUE INDEX IF NOT EXISTS units_org_name_uq ON public.units USING btree (org_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS units_org_slug_unique ON public.units USING btree (org_id, slug);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS units_select_membership ON public.units;
CREATE POLICY units_select_membership ON public.units
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = units.org_id AND m.user_id = auth.uid()))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS units_insert_org_admin_master ON public.units;
CREATE POLICY units_insert_org_admin_master ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = units.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS units_update_org_admin_master ON public.units;
CREATE POLICY units_update_org_admin_master ON public.units
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = units.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = units.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS units_update_unit_master ON public.units;
CREATE POLICY units_update_unit_master ON public.units
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.unit_members um WHERE um.unit_id = units.id AND um.user_id = auth.uid()))
    AND (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = units.org_id AND om.user_id = auth.uid() AND om.role = 'unit_master'::app_role))
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.unit_members um WHERE um.unit_id = units.id AND um.user_id = auth.uid()))
    AND (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = units.org_id AND om.user_id = auth.uid() AND om.role = 'unit_master'::app_role))
  );

DROP POLICY IF EXISTS units_delete_org_admin_master ON public.units;
CREATE POLICY units_delete_org_admin_master ON public.units
  FOR DELETE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = units.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  );

-- ============================================================
-- TABLE: profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        NOT NULL,
  full_name   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  avatar_url  text,
  phone       text,
  updated_at  timestamptz,
  global_role text,
  disabled    boolean     NOT NULL DEFAULT false,
  disabled_at timestamptz,
  disabled_by uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_global_role_check CHECK (
    (global_role = ANY (ARRAY['platform_admin'::text, 'platform_support'::text])) OR (global_role IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_profiles_disabled ON public.profiles USING btree (disabled);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_read_for_authenticated ON public.profiles;
CREATE POLICY profiles_read_for_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_select_org_wide ON public.profiles;
CREATE POLICY profiles_select_org_wide ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1
      FROM (public.org_members mo JOIN public.org_members mv ON ((mv.org_id = mo.org_id) AND (mv.user_id = auth.uid())))
      WHERE (mo.user_id = profiles.id) AND ((mv.role)::text = ANY (ARRAY['org_admin'::text, 'org_master'::text]))
    ))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS profiles_select_unit_scope ON public.profiles;
CREATE POLICY profiles_select_unit_scope ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ((public.unit_members mu
        JOIN public.unit_members mv ON ((mv.unit_id = mu.unit_id) AND (mv.user_id = auth.uid())))
        JOIN public.org_members om ON ((om.org_id = mu.org_id) AND (om.user_id = auth.uid()) AND (om.role = 'unit_master'::app_role)))
      WHERE mu.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO public
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_org_managers ON public.profiles;
CREATE POLICY profiles_update_org_managers ON public.profiles
  FOR UPDATE TO public
  USING (
    (auth.uid() IS NOT NULL)
    AND (
      (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
      OR (EXISTS (
        SELECT 1
        FROM (public.org_members manager
          JOIN public.org_members target ON ((target.user_id = profiles.id) AND (target.org_id = manager.org_id)))
        WHERE (manager.user_id = auth.uid()) AND (manager.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role, 'unit_master'::app_role]))
      ))
    )
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL)
    AND (
      (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
      OR (EXISTS (
        SELECT 1
        FROM (public.org_members manager
          JOIN public.org_members target ON ((target.user_id = profiles.id) AND (target.org_id = manager.org_id)))
        WHERE (manager.user_id = auth.uid()) AND (manager.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role, 'unit_master'::app_role]))
      ))
    )
  );

-- Triggers on profiles
CREATE OR REPLACE FUNCTION public.guard_platform_admin_profiles()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.global_role = 'platform_admin' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Atribuir global_role=platform_admin só é permitido manualmente pelo owner (postgres).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_delete_platform_admin_profiles()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.global_role = 'platform_admin' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Deletar platform_admin só é permitido manualmente pelo owner (postgres).';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_platform_admin()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF coalesce(NEW.global_role, '') = coalesce(OLD.global_role, '') THEN
    RETURN NEW;
  END IF;
  IF NEW.global_role = 'platform_admin' OR OLD.global_role = 'platform_admin' THEN
    RAISE EXCEPTION 'Atribuir/remover global_role=platform_admin só é permitido manualmente pelo owner (postgres).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_roles_no_error()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='global_role'
  ) THEN
    NEW.global_role := OLD.global_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_platform_admin_profiles ON public.profiles;
CREATE TRIGGER trg_guard_platform_admin_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_profiles();

DROP TRIGGER IF EXISTS trg_prevent_delete_platform_admin_profiles ON public.profiles;
CREATE TRIGGER trg_prevent_delete_platform_admin_profiles
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_platform_admin_profiles();

DROP TRIGGER IF EXISTS trg_protect_platform_admin ON public.profiles;
CREATE TRIGGER trg_protect_platform_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_platform_admin();

DROP TRIGGER IF EXISTS aaa_lock_roles_no_error ON public.profiles;
CREATE TRIGGER aaa_lock_roles_no_error
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_roles_no_error();

-- ============================================================
-- TABLE: org_members
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_members (
  org_id     uuid     NOT NULL,
  user_id    uuid     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  role       app_role NOT NULL,
  CONSTRAINT org_members_pkey PRIMARY KEY (org_id, user_id),
  CONSTRAINT org_members_role_allowed CHECK (role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role, 'unit_master'::app_role, 'unit_user'::app_role])),
  CONSTRAINT org_members_role_check   CHECK (role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role, 'unit_master'::app_role, 'unit_user'::app_role])),
  CONSTRAINT org_members_org_id_fkey  FOREIGN KEY (org_id)  REFERENCES public.orgs(id)     ON DELETE CASCADE,
  CONSTRAINT org_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_members_org  ON public.org_members USING btree (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS org_members_unique_user_per_org ON public.org_members USING btree (org_id, user_id);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_members_select ON public.org_members;
CREATE POLICY org_members_select ON public.org_members
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_membership(auth.uid(), org_id)
  );

DROP POLICY IF EXISTS org_members_insert ON public.org_members;
CREATE POLICY org_members_insert ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_management_role(auth.uid(), org_id)
  );

DROP POLICY IF EXISTS org_members_update ON public.org_members;
CREATE POLICY org_members_update ON public.org_members
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_management_role(auth.uid(), org_id)
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_management_role(auth.uid(), org_id)
  );

DROP POLICY IF EXISTS org_members_delete ON public.org_members;
CREATE POLICY org_members_delete ON public.org_members
  FOR DELETE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'platform_admin'))
    OR has_org_management_role(auth.uid(), org_id)
  );

-- Trigger: prevent removing last org_admin
CREATE OR REPLACE FUNCTION public.org_admin_count(p_org uuid)
  RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COUNT(*) FROM org_members WHERE org_id = p_org AND role = 'org_admin';
$$;

CREATE OR REPLACE FUNCTION public.prevent_last_org_admin()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'org_admin' THEN
    IF org_admin_count(OLD.org_id) <= 1 THEN
      RAISE EXCEPTION 'Não é permitido remover o último org_admin da organização %', OLD.org_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.role = 'org_admin' AND NEW.role <> 'org_admin' THEN
    IF org_admin_count(OLD.org_id) <= 1 THEN
      RAISE EXCEPTION 'Não é permitido rebaixar o último org_admin da organização %', OLD.org_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_org_admin ON public.org_members;
CREATE TRIGGER trg_prevent_last_org_admin
  BEFORE UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_org_admin();

-- ============================================================
-- TABLE: unit_members
-- ============================================================

CREATE TABLE IF NOT EXISTS public.unit_members (
  unit_id    uuid NOT NULL,
  user_id    uuid NOT NULL,
  org_id     uuid,
  CONSTRAINT unit_members_pkey PRIMARY KEY (unit_id, user_id),
  CONSTRAINT unit_members_unit_id_org_id_fkey FOREIGN KEY (unit_id, org_id) REFERENCES public.units(id, org_id)    ON DELETE CASCADE,
  CONSTRAINT unit_members_user_id_org_id_fkey FOREIGN KEY (user_id, org_id) REFERENCES public.org_members(user_id, org_id) ON DELETE CASCADE,
  CONSTRAINT unit_members_user_id_fkey        FOREIGN KEY (user_id)         REFERENCES public.profiles(id)         ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_unit_members_user     ON public.unit_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_user_org ON public.unit_members USING btree (user_id, org_id);
CREATE INDEX IF NOT EXISTS unit_members_org_user_idx ON public.unit_members USING btree (org_id, user_id);

ALTER TABLE public.unit_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unit_members_select_membership ON public.unit_members;
CREATE POLICY unit_members_select_membership ON public.unit_members
  FOR SELECT TO authenticated
  USING (
    (org_id IN (SELECT org_members.org_id FROM public.org_members WHERE org_members.user_id = auth.uid()))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS unit_members_insert_org ON public.unit_members;
CREATE POLICY unit_members_insert_org ON public.unit_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = unit_members.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS unit_members_insert_unit_master ON public.unit_members;
CREATE POLICY unit_members_insert_unit_master ON public.unit_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM (public.unit_members my_um
        JOIN public.org_members my_om ON ((my_om.org_id = my_um.org_id) AND (my_om.user_id = auth.uid()) AND (my_om.role = 'unit_master'::app_role)))
      WHERE (my_um.unit_id = unit_members.unit_id) AND (my_um.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS unit_members_update_org ON public.unit_members;
CREATE POLICY unit_members_update_org ON public.unit_members
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = unit_members.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = unit_members.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS unit_members_update_unit_master ON public.unit_members;
CREATE POLICY unit_members_update_unit_master ON public.unit_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM (public.unit_members my_um
        JOIN public.org_members my_om ON ((my_om.org_id = my_um.org_id) AND (my_om.user_id = auth.uid()) AND (my_om.role = 'unit_master'::app_role)))
      WHERE (my_um.unit_id = unit_members.unit_id) AND (my_um.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM (public.unit_members my_um
        JOIN public.org_members my_om ON ((my_om.org_id = my_um.org_id) AND (my_om.user_id = auth.uid()) AND (my_om.role = 'unit_master'::app_role)))
      WHERE (my_um.unit_id = unit_members.unit_id) AND (my_um.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS unit_members_delete_org ON public.unit_members;
CREATE POLICY unit_members_delete_org ON public.unit_members
  FOR DELETE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = unit_members.org_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])))
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS unit_members_delete_unit_master ON public.unit_members;
CREATE POLICY unit_members_delete_unit_master ON public.unit_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM (public.unit_members my_um
        JOIN public.org_members my_om ON ((my_om.org_id = my_um.org_id) AND (my_om.user_id = auth.uid()) AND (my_om.role = 'unit_master'::app_role)))
      WHERE (my_um.unit_id = unit_members.unit_id) AND (my_um.user_id = auth.uid())
    )
  );

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.org_users_view AS
  SELECT om.org_id,
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    p.phone,
    om.role AS org_role
  FROM (public.org_members om JOIN public.profiles p ON (p.id = om.user_id));

CREATE OR REPLACE VIEW public.unit_users_view AS
  SELECT um.unit_id,
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    p.phone,
    om.role AS unit_role
  FROM ((public.unit_members um
    JOIN public.profiles p ON (p.id = um.user_id))
    JOIN public.org_members om ON ((om.org_id = um.org_id) AND (om.user_id = um.user_id)))
  WHERE om.role = ANY (ARRAY['unit_master'::app_role, 'unit_user'::app_role]);

-- ============================================================
-- AUTH TRIGGER: handle_new_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_update()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name  = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    phone      = NEW.raw_user_meta_data->>'phone',
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
