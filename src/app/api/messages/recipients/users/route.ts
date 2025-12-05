import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
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

    const missingIds = slice
      .filter((row: any) => !row.full_name)
      .map((row: any) => row.id as string)
      .filter(Boolean);

    let fallbackNames: Record<string, { full_name?: string | null; email?: string | null }> =
      {};

    if (missingIds.length) {
      try {
        const svc = createServiceClient();
        const { data: identities, error: identityError } = await svc.rpc(
          "get_user_identity_many",
          { p_user_ids: missingIds }
        );
        if (identityError) {
          console.warn("MESSAGES recipients resolve identity error:", identityError);
        } else if (Array.isArray(identities)) {
          identities.forEach((identity: any) => {
            if (!identity?.user_id) return;
            fallbackNames[identity.user_id] = {
              full_name: identity.full_name ?? null,
              email: identity.email ?? null,
            };
          });
        }
      } catch (err) {
        console.warn("MESSAGES recipients resolve identity failure:", err);
      }
    }

    const items = slice.map((row: any) => {
      const id = row.id as string;
      const fallback = fallbackNames[id] ?? {};
      const fullName =
        row.full_name ??
        fallback.full_name ??
        fallback.email ??
        null;
      const profile = Array.isArray(row.employee_profile)
        ? row.employee_profile[0]
        : row.employee_profile;

      return {
        id,
        full_name: fullName,
        avatar_url: row.avatar_url as string | null,
        cargo: profile?.cargo ?? null,
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
