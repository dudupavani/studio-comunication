import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  canManageCommunities,
  canPostInCommunity,
  canViewCommunityRecord,
  type CommunityRow,
  type CommunitySegmentRow,
} from "@/lib/communities/permissions";
import {
  communitySpaceParamsSchema,
  createCommunitySpacePostSchema,
} from "@/lib/communities/validations";
import {
  buildSegmentMap,
  jsonError,
  loadMembershipSets,
} from "@/lib/communities/api";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ communityId: string; spaceId: string }> }
) {
  try {
    const parsedParams = communitySpaceParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const { communityId, spaceId } = parsedParams.data;

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const rawPayload = await req.json().catch(() => null);
    const parsed = createCommunitySpacePostSchema.safeParse(rawPayload ?? {});

    if (!parsed.success) {
      return jsonError(400, "Dados inválidos para criar publicação.", parsed.error.flatten());
    }

    const payload = parsed.data;

    const svc = createServiceClient();
    const canManage = canManageCommunities(auth);

    const [communityRes, segmentsRes, spaceRes, memberships] = await Promise.all([
      svc
        .from("communities")
        .select(
          "id, org_id, name, visibility, segment_type, allow_unit_master_post, allow_unit_user_post, created_by, created_at, updated_at"
        )
        .eq("id", communityId)
        .maybeSingle(),
      svc
        .from("community_segments")
        .select("community_id, org_id, target_type, target_id, created_at")
        .eq("community_id", communityId),
      svc
        .from("community_spaces")
        .select("id, community_id, org_id, space_type")
        .eq("id", spaceId)
        .eq("community_id", communityId)
        .maybeSingle(),
      canManage
        ? Promise.resolve({ groupIds: new Set<string>(), teamIds: new Set<string>() })
        : loadMembershipSets(svc, auth.orgId, auth.userId),
    ]);

    if (communityRes.error) {
      return jsonError(500, "Falha ao carregar comunidade.", communityRes.error);
    }

    const community = (communityRes.data ?? null) as CommunityRow | null;
    if (!community || community.org_id !== auth.orgId) {
      return jsonError(404, "Comunidade não encontrada.");
    }

    if (spaceRes.error || !spaceRes.data) {
      return jsonError(404, "Espaço não encontrado.");
    }

    const space = spaceRes.data;
    if (space.space_type !== "publicacoes") {
      return jsonError(400, "Publicações só são permitidas em espaços do tipo 'publicacoes'.");
    }

    const segments = (segmentsRes.data ?? []) as CommunitySegmentRow[];
    const segmentMap = buildSegmentMap(segments);
    const segmentTargetIds = (segmentMap.get(communityId) ?? []).map((s) => s.target_id);

    const canView = canViewCommunityRecord({ auth, community, segmentTargetIds, memberships });
    if (!canView) {
      return jsonError(403, "Você não tem acesso a esta comunidade.");
    }

    const canPost = canPostInCommunity(auth, community);
    if (!canPost) {
      return jsonError(403, "Você não tem permissão para publicar nesta comunidade.");
    }

    const { data: inserted, error: insertError } = await svc
      .from("community_space_posts")
      .insert({
        community_id: communityId,
        space_id: spaceId,
        org_id: auth.orgId,
        title: payload.title,
        cover_path: payload.coverPath ?? null,
        cover_url: payload.coverUrl ?? null,
        blocks: payload.blocks as any,
        created_by: auth.userId,
      })
      .select("id, community_id, space_id, org_id, title, cover_url, created_by, created_at")
      .maybeSingle();

    if (insertError || !inserted) {
      return jsonError(500, "Falha ao criar publicação.", insertError);
    }

    return NextResponse.json(
      {
        item: {
          id: inserted.id,
          communityId: inserted.community_id,
          spaceId: inserted.space_id,
          orgId: inserted.org_id,
          title: inserted.title,
          coverUrl: inserted.cover_url,
          createdAt: inserted.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(500, "Falha inesperada ao criar publicação.", error);
  }
}
