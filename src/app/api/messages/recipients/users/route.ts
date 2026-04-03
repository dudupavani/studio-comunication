import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";
import { resolveIdentityMap } from "@/lib/identity";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }
    const svc = createServiceClient();

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const idsParam = searchParams.get("ids") ?? "";
    const requestedIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const limitParam = Number(searchParams.get("limit") ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 20, 1), 100);
    const cursorParam = searchParams.get("cursor");
    const offset = Number.isFinite(Number(cursorParam)) ? Number(cursorParam) : 0;

    const start = offset;
    const end = start + limit;

    const baseSelect =
      `id, full_name, avatar_url, org_members!inner ( org_id ), employee_profile!left ( cargo )`;

    let query = svc
      .from("profiles")
      .select(baseSelect)
      .eq("org_members.org_id", auth.orgId);

    if (requestedIds.length) {
      query = query.in("id", requestedIds);
    } else {
      query = query
        .order("full_name", { ascending: true, nullsFirst: true })
        .range(start, end);

      if (q) {
        const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
        query = query.ilike("full_name", like);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error("MESSAGES recipients users error:", error);
      return errorResponse(500, "db_error", "Failed to load users");
    }

    const rows = Array.isArray(data) ? data : [];
    const hasNext = requestedIds.length ? false : rows.length > limit;
    const slice = requestedIds.length ? rows : hasNext ? rows.slice(0, limit) : rows;

    const ids = slice.map((row: any) => row.id as string).filter(Boolean);
    const identityMap =
      ids.length > 0
        ? await resolveIdentityMap(ids, { svc, orgId: auth.orgId })
        : new Map();

    const items = slice.map((row: any) => {
      const id = row.id as string;
      const identity = identityMap.get(id);
      const fullName =
        row.full_name ??
        identity?.full_name ??
        identity?.email ??
        null;
      const profile = Array.isArray(row.employee_profile)
        ? row.employee_profile[0]
        : row.employee_profile;

      return {
        id,
        full_name: fullName,
        avatar_url: row.avatar_url ?? identity?.avatar_url ?? null,
        cargo: profile?.cargo ?? identity?.title ?? null,
      };
    });

    return NextResponse.json({
      items,
      nextCursor: hasNext ? String(offset + limit) : undefined,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
