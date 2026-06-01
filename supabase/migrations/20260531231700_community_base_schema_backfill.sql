-- Historical backfill for the base Communities schema used by the app.
-- This is intentionally idempotent: it records the expected contract without
-- replacing existing production functions or rewriting existing data.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_visibility') THEN
    CREATE TYPE public.community_visibility AS ENUM ('global', 'segmented');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_segment_type') THEN
    CREATE TYPE public.community_segment_type AS ENUM ('group', 'team');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_space_type') THEN
    CREATE TYPE public.community_space_type AS ENUM ('publicacoes', 'eventos');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  visibility public.community_visibility NOT NULL DEFAULT 'global',
  segment_type public.community_segment_type NULL,
  allow_unit_master_post boolean NOT NULL DEFAULT true,
  allow_unit_user_post boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communities_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT communities_name_len CHECK (char_length(name) <= 120),
  CONSTRAINT communities_segment_consistency CHECK (
    (visibility = 'global' AND segment_type IS NULL)
    OR (visibility = 'segmented' AND segment_type IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS communities_org_lower_name_key
  ON public.communities (org_id, lower(name));

CREATE INDEX IF NOT EXISTS communities_org_name_idx
  ON public.communities (org_id, name);

CREATE TABLE IF NOT EXISTS public.community_segments (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  target_type public.community_segment_type NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS community_segments_org_target_idx
  ON public.community_segments (org_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS public.community_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  space_type public.community_space_type NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_spaces_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT community_spaces_name_len CHECK (char_length(name) <= 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS community_spaces_community_lower_name_key
  ON public.community_spaces (community_id, lower(name));

CREATE INDEX IF NOT EXISTS community_spaces_org_community_idx
  ON public.community_spaces (org_id, community_id, name);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_spaces ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regprocedure('public.can_view_community(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.can_view_community(p_community_id uuid, p_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1
          FROM public.communities community
          JOIN public.org_members member
            ON member.org_id = community.org_id
           AND member.user_id = p_user_id
          WHERE community.id = p_community_id
            AND (
              community.visibility = 'global'
              OR EXISTS (
                SELECT 1
                FROM public.community_segments segment
                WHERE segment.community_id = community.id
                  AND segment.target_type = 'group'
                  AND EXISTS (
                    SELECT 1
                    FROM public.user_group_members group_member
                    WHERE group_member.org_id = community.org_id
                      AND group_member.group_id = segment.target_id
                      AND group_member.user_id = p_user_id
                  )
              )
              OR EXISTS (
                SELECT 1
                FROM public.community_segments segment
                WHERE segment.community_id = community.id
                  AND segment.target_type = 'team'
                  AND EXISTS (
                    SELECT 1
                    FROM public.equipe_members team_member
                    WHERE team_member.org_id = community.org_id
                      AND team_member.equipe_id = segment.target_id
                      AND team_member.user_id = p_user_id
                  )
              )
            )
        )
      $body$
    $fn$;
  END IF;

  IF to_regprocedure('public.can_manage_community(uuid, uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.can_manage_community(p_community_id uuid, p_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1
          FROM public.communities community
          JOIN public.org_members member
            ON member.org_id = community.org_id
           AND member.user_id = p_user_id
          WHERE community.id = p_community_id
            AND member.role IN ('org_admin', 'org_master')
        )
      $body$
    $fn$;
  END IF;
END $$;
