import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";

type ViewerRow = {
  user_id: string | null;
  opened_at: string;
};

type IdentityMap = Record<
  string,
  {
    name: string | null;
    avatar: string | null;
    title: string | null;
  }
>;

function buildHourlySeries(rows: { created_at: string }[]) {
  const buckets = Array.from({ length: 24 }, () => 0);
  rows.forEach((row) => {
    if (!row.created_at) return;
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) return;
    const hour = date.getHours();
    buckets[hour] += 1;
  });
  return buckets.map((value, index) => ({
    label: `${String(index).padStart(2, "0")}h`,
    value,
  }));
}

function buildDailySeries(rows: { created_at: string }[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.created_at) return;
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([key, value]) => {
      const [year, month, day] = key.split("-");
      return { label: `${day}/${month}`, value };
    });
}

async function buildIdentityMap(
  svc: ReturnType<typeof createServiceClient>,
  userIds: string[]
): Promise<IdentityMap> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const map: IdentityMap = {};
  if (!uniqueIds.length) return map;
  const { data: profiles } = await svc
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", uniqueIds);
  (profiles ?? []).forEach((profile: any) => {
    map[profile.id as string] = {
      name: (profile.full_name as string | null) ?? null,
      avatar: (profile.avatar_url as string | null) ?? null,
      title: null,
    };
  });
  const { data: cargos } = await svc
    .from("employee_profile")
    .select("user_id, cargo")
    .in("user_id", uniqueIds);
  (cargos ?? []).forEach((row: any) => {
    const id = row.user_id as string;
    const title = (row.cargo as string | null) ?? null;
    if (!map[id]) {
      map[id] = { name: null, avatar: null, title };
    } else {
      map[id].title = title ?? map[id].title;
    }
  });
  return map;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext<"/api/messages/announcements/[announcementId]/metrics">
) {
  try {
    const { announcementId } = await context.params;
    const supabaseUser = createServerClientWithCookies();
    const auth = await getAuthContext(supabaseUser);
    const svc = createServiceClient();

    const { data: announcement, error: announcementErr } = await svc
      .from("announcements")
      .select("id, org_id, author_id")
      .eq("id", announcementId)
      .maybeSingle();

    if (announcementErr || !announcement) {
      return errorResponse(404, "not_found", "Comunicado não encontrado.");
    }
    if (announcement.org_id !== auth.orgId) {
      return errorResponse(403, "forbidden", "Acesso negado.");
    }

    const canViewMetrics =
      auth.isPlatformAdmin ||
      auth.isOrgAdmin ||
      announcement.author_id === auth.userId;

    if (!canViewMetrics) {
      return errorResponse(403, "forbidden", "Acesso negado.");
    }

    const [{ data: viewRows, error: viewsError }, { data: likeRows, error: likeError }] =
      await Promise.all([
        svc
          .from("announcement_views")
          .select("user_id, opened_at")
          .eq("announcement_id", announcementId)
          .order("opened_at", { ascending: false }),
        svc
          .from("announcement_reactions")
          .select("author_id, created_at")
          .eq("announcement_id", announcementId),
      ]);

    if (viewsError) {
      return errorResponse(
        500,
        "db_error",
        "Falha ao buscar visualizações."
      );
    }
    if (likeError) {
      return errorResponse(500, "db_error", "Falha ao buscar reações.");
    }

    const { data: recipientRows, error: recipientError } = await svc
      .from("notifications")
      .select("user_id")
      .eq("org_id", auth.orgId)
      .eq("type", "announcement.sent")
      .contains("metadata", { announcement_id: announcementId });

    if (recipientError) {
      return errorResponse(
        500,
        "db_error",
        "Não foi possível calcular destinatários."
      );
    }

    const recipientSet = new Set(
      (recipientRows ?? [])
        .map((row: any) => row.user_id as string | null)
        .filter(Boolean) as string[]
    );

    const viewerAggregation = new Map<
      string,
      { count: number; lastOpened: string }
    >();
    (viewRows ?? []).forEach((row) => {
      if (!row.user_id) return;
      const existing = viewerAggregation.get(row.user_id);
      if (existing) {
        existing.count += 1;
        if (
          new Date(row.opened_at).getTime() >
          new Date(existing.lastOpened).getTime()
        ) {
          existing.lastOpened = row.opened_at;
        }
      } else {
        viewerAggregation.set(row.user_id, {
          count: 1,
          lastOpened: row.opened_at,
        });
      }
    });

    const uniqueViewers = Array.from(viewerAggregation.keys());

    const identities = await buildIdentityMap(svc, uniqueViewers);

    const viewers = uniqueViewers
      .map((userId) => {
        const info = identities[userId];
        const aggregate = viewerAggregation.get(userId)!;
        return {
          userId,
          name: info?.name ?? info?.title ?? "Usuário",
          title: info?.title ?? null,
          avatarUrl: info?.avatar ?? null,
          openedAt: aggregate.lastOpened,
          viewCount: aggregate.count,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
      );

    const totalRecipients = recipientSet.size;
    const totalViews = uniqueViewers.length;
    const openRate =
      totalRecipients > 0 ? totalViews / totalRecipients : 0;

    const totalLikes = likeRows?.length ?? 0;
    const likeRate =
      totalViews > 0 ? totalLikes / totalViews : 0;

    const hourlySeries = buildHourlySeries(likeRows ?? []);
    const dailySeries = buildDailySeries(likeRows ?? []);

    return NextResponse.json({
      totalRecipients,
      uniqueViews: totalViews,
      openRate,
      likes: {
        total: totalLikes,
        likeRate,
      },
      viewers,
      likesSeries: {
        day: hourlySeries,
        month: dailySeries,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
