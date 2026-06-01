-- Migration: integridade relacional auth.users → profiles → org_members → unit_members
-- Corrige lacunas identificadas na auditoria de 2026-05-29:
--   1. FK profiles.id → auth.users.id
--   2. unit_members.org_id NOT NULL (backfill + constraint)
--   3. Triggers on_auth_user_created / on_auth_user_updated versionados
--   4. Funções RLS helper versionadas (idempotentes)
--   5. profiles_read_for_authenticated restrita ao mesmo tenant

-- ============================================================
-- 4. FUNÇÕES RLS HELPER (antes das policies que as referenciam)
-- Usa parâmetros posicionais ($1, $2) para não conflitar com
-- nomes de parâmetros da versão já existente no banco.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'platform_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_membership(p_user_id uuid, p_org_id uuid)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = p_user_id AND org_id = p_org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_management_role(p_user_id uuid, p_org_id uuid)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = p_user_id
      AND org_id = p_org_id
      AND role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])
  )
$$;

-- ============================================================
-- 1. FK profiles.id → auth.users.id  (CRÍTICO)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_id_auth_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. unit_members.org_id NOT NULL  (ALTO)
-- ============================================================

-- Backfill: derivar org_id da unidade para linhas com NULL
UPDATE public.unit_members um
SET org_id = u.org_id
FROM public.units u
WHERE u.id = um.unit_id
  AND um.org_id IS NULL;

-- Aplicar NOT NULL somente se a coluna ainda for nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'unit_members'
      AND column_name  = 'org_id'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.unit_members
      ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 3. TRIGGERS on auth.users versionados  (ALTO)
-- ============================================================

-- handle_new_user: cria profile automaticamente ao criar usuário no auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- handle_user_update: sincroniza metadados no profile ao atualizar auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- ============================================================
-- 5. POLICY profiles_read_for_authenticated — restringir ao mesmo tenant  (BAIXO)
-- ============================================================
-- Antes: USING (true) — qualquer autenticado lia qualquer profile.
-- Agora: restringe à mesma org, self e platform_admin.

DROP POLICY IF EXISTS profiles_read_for_authenticated ON public.profiles;
CREATE POLICY profiles_read_for_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.org_members om_target
      JOIN public.org_members om_viewer
        ON om_viewer.org_id = om_target.org_id
        AND om_viewer.user_id = auth.uid()
      WHERE om_target.user_id = profiles.id
    )
  );
