const {
  parseSupabaseTypesContent,
} = require("../scripts/supabase-drift-audit/type-analyzer.cjs");
const {
  parseSqlArtifacts,
} = require("../scripts/supabase-drift-audit/migration-parser.cjs");

describe("supabase drift audit parsers", () => {
  test("parses generated supabase types blocks", () => {
    const parsed = parseSupabaseTypesContent(`
    Tables: {
      communities: {
        Row: { id: string }
      }
      profiles: {
        Row: { id: string }
      }
    }
    Views: {
      community_summary: {
        Row: { id: string }
      }
    }
    Functions: {
      update_profile_self: {
        Args: { p_avatar_url: string; p_full_name: string; p_phone: string }
        Returns: undefined
      }
      is_platform_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      community_visibility: "global" | "segmented"
    }
    CompositeTypes: {
    }
    `);

    expect(parsed.tables).toEqual(["communities", "profiles"]);
    expect(parsed.views).toEqual(["community_summary"]);
    expect(parsed.enums).toEqual(["community_visibility"]);
    expect(Object.keys(parsed.functions).sort()).toEqual([
      "is_platform_admin",
      "update_profile_self",
    ]);
    expect(parsed.functions.update_profile_self.signature).toContain(
      "p_avatar_url: string",
    );
  });

  test("parses sql artifacts from migrations or remote dump", () => {
    const parsed = parseSqlArtifacts(
      `
      create table public.communities (
        id uuid primary key
      );

      create type public.community_visibility as enum ('global', 'segmented');

      create or replace function public.update_profile_self(
        p_full_name text,
        p_phone text
      ) returns void as $$
      begin
        null;
      end;
      $$ language plpgsql;

      create policy "profiles_read" on public.profiles
        for select using (true);

      create trigger profiles_updated_at
        before update on public.profiles
        for each row execute procedure public.handle_updated_at();
      `,
      "database/migrations/20260101000001_core.sql",
    );

    expect(Object.keys(parsed.tables)).toEqual(["communities"]);
    expect(Object.keys(parsed.enums)).toEqual(["community_visibility"]);
    expect(Object.keys(parsed.functions)).toEqual(["update_profile_self"]);
    expect(Object.keys(parsed.policies)).toEqual(["profiles:profiles_read"]);
    expect(Object.keys(parsed.triggers)).toEqual(["profiles_updated_at"]);
  });
});
