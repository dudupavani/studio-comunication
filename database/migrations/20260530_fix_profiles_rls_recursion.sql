-- Corrige recursão infinita em políticas RLS da tabela profiles.
--
-- Causa: profiles_read_for_authenticated chamava is_platform_admin(), que lê
-- de profiles → triggers a mesma policy → recursão infinita ao salvar perfil.
--
-- Fix: remover is_platform_admin() das políticas SELECT de profiles.
-- Platform admins usam service role no painel admin (bypass RLS implícito),
-- então não precisam do check aqui.

DROP POLICY IF EXISTS profiles_read_for_authenticated ON public.profiles;
CREATE POLICY profiles_read_for_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.org_members om_target
      JOIN public.org_members om_viewer
        ON om_viewer.org_id = om_target.org_id
        AND om_viewer.user_id = auth.uid()
      WHERE om_target.user_id = profiles.id
    )
  );

-- profiles_select_org_wide também chamava is_platform_admin() —
-- a condição é coberta por profiles_read_for_authenticated acima.
DROP POLICY IF EXISTS profiles_select_org_wide ON public.profiles;
CREATE POLICY profiles_select_org_wide ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM (public.org_members mo
        JOIN public.org_members mv
          ON mv.org_id = mo.org_id AND mv.user_id = auth.uid())
      WHERE mo.user_id = profiles.id
        AND mv.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role])
    )
  );

-- profiles_update_org_managers: remove is_platform_admin() para eliminar recursão.
-- is_platform_admin() lê de profiles dentro de uma policy de UPDATE de profiles
-- → PostgreSQL aborta com 42P17 (recursão) mesmo com SECURITY DEFINER + BYPASSRLS.
-- Platform admins usam service role no admin (BYPASSRLS implícito), sem necessidade
-- desta condição na policy.
DROP POLICY IF EXISTS profiles_update_org_managers ON public.profiles;
CREATE POLICY profiles_update_org_managers ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_members manager
      JOIN public.org_members target
        ON target.user_id = profiles.id AND target.org_id = manager.org_id
      WHERE manager.user_id = auth.uid()
        AND manager.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role, 'unit_master'::app_role])
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_members manager
      JOIN public.org_members target
        ON target.user_id = profiles.id AND target.org_id = manager.org_id
      WHERE manager.user_id = auth.uid()
        AND manager.role = ANY (ARRAY['org_admin'::app_role, 'org_master'::app_role, 'unit_master'::app_role])
    )
  );
