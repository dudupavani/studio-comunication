import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const limitParam = Number(searchParams.get("limit") ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 20, 1), 100);
    const cursorParam = searchParams.get("cursor");
    const offset = Number.isFinite(Number(cursorParam)) ? Number(cursorParam) : 0;

    const start = offset;
    const end = start + limit;

    let query = supabase
      .from("user_groups")
      .select(
        `id, name, description, color, user_group_members(count)`
      )
      .eq("org_id", auth.orgId)
      .order("name", { ascending: true })
      .range(start, end);

    if (q) {
      const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
      query = query.ilike("name", like);
    }

    const { data, error } = await query;
    if (error) {
      console.error("MESSAGES recipients groups error:", error);
      return errorResponse(500, "db_error", "Failed to load groups");
    }

    const rows = Array.isArray(data) ? data : [];
    const hasNext = rows.length > limit;
    const slice = hasNext ? rows.slice(0, limit) : rows;

    const items = slice.map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      color: (row.color as string) ?? null,
      membersCount: Array.isArray(row.user_group_members)
        ? row.user_group_members[0]?.count ?? 0
        : 0,
    }));

    return NextResponse.json({
      items,
      nextCursor: hasNext ? String(offset + limit) : undefined,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
