-- RPC: remove_user_from_org
-- Executa todos os deletes de vínculos em uma única transação atômica,
-- eliminando o risco de estado parcial caso algum delete intermediário falhe.
-- Chamada server-side via service role; a autorização é validada na camada de aplicação.

CREATE OR REPLACE FUNCTION public.remove_user_from_org(p_user_id uuid, p_org_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  DELETE FROM public.unit_members
    WHERE org_id = p_org_id AND user_id = p_user_id;

  DELETE FROM public.equipe_members
    WHERE org_id = p_org_id AND user_id = p_user_id;

  DELETE FROM public.user_group_members
    WHERE org_id = p_org_id AND user_id = p_user_id;

  DELETE FROM public.employee_profile
    WHERE org_id = p_org_id AND user_id = p_user_id;

  -- org_members por último: FKs de outras tabelas apontam para cá
  DELETE FROM public.org_members
    WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;
