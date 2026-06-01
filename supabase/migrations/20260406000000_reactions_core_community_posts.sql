-- Core de reacoes reutilizavel entre modulos + vinculo inicial para community_space_posts.

CREATE TABLE IF NOT EXISTS reaction_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  target_kind     TEXT NOT NULL,
  allow_reactions BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reaction_targets_target_kind_chk
    CHECK (char_length(target_kind) BETWEEN 1 AND 64)
);

CREATE INDEX IF NOT EXISTS idx_reaction_targets_org_kind_created
  ON reaction_targets (org_id, target_kind, created_at DESC);

CREATE TABLE IF NOT EXISTS reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id  UUID NOT NULL REFERENCES reaction_targets(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reactions_emoji_len_chk CHECK (char_length(emoji) BETWEEN 1 AND 16),
  CONSTRAINT reactions_target_user_emoji_key UNIQUE (target_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_target_emoji
  ON reactions (target_id, emoji);

CREATE INDEX IF NOT EXISTS idx_reactions_org_target_created
  ON reactions (org_id, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reaction_counters (
  target_id   UUID NOT NULL REFERENCES reaction_targets(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reaction_counters_pkey PRIMARY KEY (target_id, emoji),
  CONSTRAINT reaction_counters_count_nonnegative CHECK (count >= 0),
  CONSTRAINT reaction_counters_emoji_len_chk CHECK (char_length(emoji) BETWEEN 1 AND 16)
);

CREATE TABLE IF NOT EXISTS community_space_post_reaction_targets (
  post_id       UUID PRIMARY KEY REFERENCES community_space_posts(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL UNIQUE REFERENCES reaction_targets(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  space_id      UUID NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csp_reaction_targets_scope
  ON community_space_post_reaction_targets (community_id, space_id, created_at DESC);

ALTER TABLE reaction_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reaction_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_space_post_reaction_targets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reaction_targets'
      AND policyname = 'service_full_access'
  ) THEN
    CREATE POLICY "service_full_access" ON reaction_targets
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reactions'
      AND policyname = 'service_full_access'
  ) THEN
    CREATE POLICY "service_full_access" ON reactions
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reaction_counters'
      AND policyname = 'service_full_access'
  ) THEN
    CREATE POLICY "service_full_access" ON reaction_counters
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_space_post_reaction_targets'
      AND policyname = 'service_full_access'
  ) THEN
    CREATE POLICY "service_full_access" ON community_space_post_reaction_targets
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reaction_targets_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reaction_targets_set_updated_at ON reaction_targets;
CREATE TRIGGER trg_reaction_targets_set_updated_at
BEFORE UPDATE ON reaction_targets
FOR EACH ROW
EXECUTE FUNCTION public.reaction_targets_set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_reaction_counters_from_reactions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reaction_counters (target_id, emoji, count, updated_at)
    VALUES (NEW.target_id, NEW.emoji, 1, NOW())
    ON CONFLICT (target_id, emoji)
    DO UPDATE SET
      count = reaction_counters.count + 1,
      updated_at = NOW();
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE reaction_counters
    SET
      count = GREATEST(count - 1, 0),
      updated_at = NOW()
    WHERE target_id = OLD.target_id
      AND emoji = OLD.emoji;

    DELETE FROM reaction_counters
    WHERE target_id = OLD.target_id
      AND emoji = OLD.emoji
      AND count <= 0;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.target_id = NEW.target_id AND OLD.emoji = NEW.emoji THEN
      RETURN NEW;
    END IF;

    UPDATE reaction_counters
    SET
      count = GREATEST(count - 1, 0),
      updated_at = NOW()
    WHERE target_id = OLD.target_id
      AND emoji = OLD.emoji;

    DELETE FROM reaction_counters
    WHERE target_id = OLD.target_id
      AND emoji = OLD.emoji
      AND count <= 0;

    INSERT INTO reaction_counters (target_id, emoji, count, updated_at)
    VALUES (NEW.target_id, NEW.emoji, 1, NOW())
    ON CONFLICT (target_id, emoji)
    DO UPDATE SET
      count = reaction_counters.count + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reaction_counters ON reactions;
CREATE TRIGGER trg_sync_reaction_counters
AFTER INSERT OR DELETE OR UPDATE OF target_id, emoji
ON reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_reaction_counters_from_reactions();

CREATE OR REPLACE FUNCTION public.ensure_reaction_target_for_community_post()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  linked_target_id UUID;
BEGIN
  SELECT target_id
  INTO linked_target_id
  FROM community_space_post_reaction_targets
  WHERE post_id = NEW.id;

  IF linked_target_id IS NULL THEN
    INSERT INTO reaction_targets (org_id, target_kind, allow_reactions, created_by)
    VALUES (NEW.org_id, 'community_post', true, NEW.created_by)
    RETURNING id INTO linked_target_id;

    INSERT INTO community_space_post_reaction_targets (
      post_id,
      target_id,
      org_id,
      community_id,
      space_id
    )
    VALUES (
      NEW.id,
      linked_target_id,
      NEW.org_id,
      NEW.community_id,
      NEW.space_id
    );
  ELSE
    UPDATE reaction_targets
    SET
      org_id = NEW.org_id,
      updated_at = NOW()
    WHERE id = linked_target_id
      AND org_id IS DISTINCT FROM NEW.org_id;

    UPDATE community_space_post_reaction_targets
    SET
      org_id = NEW.org_id,
      community_id = NEW.community_id,
      space_id = NEW.space_id
    WHERE post_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_create_reaction_target ON community_space_posts;
CREATE TRIGGER trg_community_post_create_reaction_target
AFTER INSERT ON community_space_posts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_reaction_target_for_community_post();

DROP TRIGGER IF EXISTS trg_community_post_update_reaction_target ON community_space_posts;
CREATE TRIGGER trg_community_post_update_reaction_target
AFTER UPDATE OF org_id, community_id, space_id, created_by
ON community_space_posts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_reaction_target_for_community_post();

CREATE OR REPLACE FUNCTION public.cleanup_reaction_target_for_community_post()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM reaction_targets
  WHERE id = OLD.target_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_reaction_target_for_community_post
  ON community_space_post_reaction_targets;
CREATE TRIGGER trg_cleanup_reaction_target_for_community_post
AFTER DELETE ON community_space_post_reaction_targets
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_reaction_target_for_community_post();

DO $$
DECLARE
  post_row RECORD;
  new_target_id UUID;
BEGIN
  FOR post_row IN
    SELECT
      post.id,
      post.org_id,
      post.community_id,
      post.space_id,
      post.created_by
    FROM community_space_posts AS post
    LEFT JOIN community_space_post_reaction_targets AS link
      ON link.post_id = post.id
    WHERE link.post_id IS NULL
  LOOP
    INSERT INTO reaction_targets (org_id, target_kind, allow_reactions, created_by)
    VALUES (post_row.org_id, 'community_post', true, post_row.created_by)
    RETURNING id INTO new_target_id;

    INSERT INTO community_space_post_reaction_targets (
      post_id,
      target_id,
      org_id,
      community_id,
      space_id
    )
    VALUES (
      post_row.id,
      new_target_id,
      post_row.org_id,
      post_row.community_id,
      post_row.space_id
    );
  END LOOP;
END;
$$;

UPDATE community_space_post_reaction_targets AS link
SET
  org_id = post.org_id,
  community_id = post.community_id,
  space_id = post.space_id
FROM community_space_posts AS post
WHERE post.id = link.post_id
  AND (
    link.org_id IS DISTINCT FROM post.org_id
    OR link.community_id IS DISTINCT FROM post.community_id
    OR link.space_id IS DISTINCT FROM post.space_id
  );

UPDATE reaction_targets AS target
SET
  org_id = link.org_id,
  updated_at = NOW()
FROM community_space_post_reaction_targets AS link
WHERE link.target_id = target.id
  AND target.org_id IS DISTINCT FROM link.org_id;
