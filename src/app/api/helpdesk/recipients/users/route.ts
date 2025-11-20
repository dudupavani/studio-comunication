import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import { errorResponse, handleRouteError } from "@/lib/helpdesk/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const limitParam = Number(searchParams.get("limit") ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 20, 1), 100);
    const cursorParam = searchParams.get("cursor");
    const offset = Number.isFinite(Number(cursorParam)) ? Number(cursorParam) : 0;

    const start = offset;
    const end = start + limit;

    let query = supabase
      .from("profiles")
      .select(
        `id, full_name, avatar_url, org_members!inner ( org_id )`
      )
      .eq("org_members.org_id", auth.orgId)
      .order("full_name", { ascending: true, nullsFirst: true })
      .range(start, end);

    if (q) {
      const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
      query = query.ilike("full_name", like);
    }

    const { data, error } = await query;
    if (error) {
      console.error("HELPDESK recipients users error:", error);
      return errorResponse(500, "db_error", "Failed to load users");
    }

    const rows = Array.isArray(data) ? data : [];
    const hasNext = rows.length > limit;
    const slice = hasNext ? rows.slice(0, limit) : rows;

    const items = slice.map((row: any) => ({
      id: row.id as string,
      full_name: row.full_name as string | null,
      avatar_url: row.avatar_url as string | null,
    }));

    return NextResponse.json({
      items,
      nextCursor: hasNext ? String(offset + limit) : undefined,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
