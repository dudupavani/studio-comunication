-- community_space_posts: stores publications (posts) inside community spaces
CREATE TABLE IF NOT EXISTS community_space_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  space_id     UUID NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  cover_path   TEXT,
  cover_url    TEXT,
  blocks       JSONB NOT NULL DEFAULT '[]',
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE community_space_posts ENABLE ROW LEVEL SECURITY;

-- All access goes through service role (route handlers enforce permissions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_space_posts'
      AND policyname = 'service_full_access'
  ) THEN
    CREATE POLICY "service_full_access" ON community_space_posts
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

-- Speed up feed queries (community + space + recency)
CREATE INDEX IF NOT EXISTS idx_community_space_posts_community_space
  ON community_space_posts (community_id, space_id, created_at DESC);
