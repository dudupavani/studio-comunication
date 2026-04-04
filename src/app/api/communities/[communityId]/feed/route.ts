import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  canManageCommunities,
  canViewCommunityRecord,
  type CommunityRow,
  type CommunitySegmentRow,
} from "@/lib/communities/permissions";
import { communityParamsSchema } from "@/lib/communities/validations";
import { buildSegmentMap, jsonError, loadMembershipSets } from "@/lib/communities/api";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ communityId: string }> }
) {
  try {
    const parsedParams = communityParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const { communityId } = parsedParams.data;

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const svc = createServiceClient();
    const canManage = canManageCommunities(auth);

    const [communityRes, segmentsRes, spacesRes, memberships] = await Promise.all([
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
        .select("id, community_id, org_id, name, space_type, created_at, updated_at")
        .eq("community_id", communityId)
        .order("name", { ascending: true }),
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

    if (segmentsRes.error) {
      return jsonError(500, "Falha ao carregar segmentação da comunidade.", segmentsRes.error);
    }

    if (spacesRes.error) {
      return jsonError(500, "Falha ao carregar espaços da comunidade.", spacesRes.error);
    }

    const segments = (segmentsRes.data ?? []) as CommunitySegmentRow[];
    const segmentMap = buildSegmentMap(segments);
    const segmentTargetIds = (segmentMap.get(communityId) ?? []).map(
      (segment) => segment.target_id
    );

    const canView = canViewCommunityRecord({
      auth,
      community,
      segmentTargetIds,
      memberships,
    });

    if (!canView) {
      return jsonError(403, "Você não tem acesso a esta comunidade.");
    }

    const visibleSpaces = (spacesRes.data ?? []).map((space: any) => ({
      id: space.id,
      communityId: space.community_id,
      orgId: space.org_id,
      name: space.name,
      spaceType: space.space_type,
      createdAt: space.created_at,
      updatedAt: space.updated_at,
    }));

    return NextResponse.json({
      item: {
        communityId,
        visibleSpaceIds: visibleSpaces.map((space) => space.id),
        spaces: visibleSpaces,
        items: [],
        note:
          "Feed consolidado V1: estrutura pronta; conteúdo de publicações/eventos será acoplado em expansão futura.",
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao carregar feed da comunidade.", error);
  }
}
