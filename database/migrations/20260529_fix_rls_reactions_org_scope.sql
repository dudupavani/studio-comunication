-- Substitui políticas service_full_access (USING true para todos os autenticados)
-- por políticas com escopo de organização nas tabelas de reações e community_space_posts.
-- O service_role bypassa RLS automaticamente no Supabase — sem impacto nas rotas de API.

-- ============================================================
-- reaction_targets
-- ============================================================
DROP POLICY IF EXISTS "service_full_access" ON reaction_targets;

CREATE POLICY "authenticated_org_read" ON reaction_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = reaction_targets.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- reactions
-- ============================================================
DROP POLICY IF EXISTS "service_full_access" ON reactions;

CREATE POLICY "authenticated_org_read" ON reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = reactions.org_id
        AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_own_insert" ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = reactions.org_id
        AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_own_delete" ON reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- reaction_counters
-- (gerenciada por triggers; sem escrita direta do cliente)
-- ============================================================
DROP POLICY IF EXISTS "service_full_access" ON reaction_counters;

CREATE POLICY "authenticated_org_read" ON reaction_counters
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reaction_targets rt
      JOIN org_members om ON om.org_id = rt.org_id AND om.user_id = auth.uid()
      WHERE rt.id = reaction_counters.target_id
    )
  );

-- ============================================================
-- community_space_post_reaction_targets
-- ============================================================
DROP POLICY IF EXISTS "service_full_access" ON community_space_post_reaction_targets;

CREATE POLICY "authenticated_org_read" ON community_space_post_reaction_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = community_space_post_reaction_targets.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- community_space_posts
-- ============================================================
DROP POLICY IF EXISTS "service_full_access" ON community_space_posts;

CREATE POLICY "authenticated_org_read" ON community_space_posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = community_space_posts.org_id
        AND org_members.user_id = auth.uid()
    )
  );
