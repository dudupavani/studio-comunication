-- Harden community module RLS so all product access goes through route handlers.
-- Route handlers use the service role and enforce tenant scope and permissions.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'communities',
    'community_segments',
    'community_spaces',
    'community_space_posts',
    'reaction_targets',
    'reactions',
    'reaction_counters',
    'community_space_post_reaction_targets'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
      EXECUTE format('DROP POLICY IF EXISTS service_full_access ON public.%I', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_service_role_only', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        table_name || '_service_role_only',
        table_name
      );
    END IF;
  END LOOP;
END $$;
