import type { AuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import {
  canManageCommunities,
  canViewCommunityRecord,
  type CommunityRow,
  type CommunitySegmentRow,
} from "@/lib/communities/permissions";
import { buildSegmentMap, loadMembershipSets } from "@/lib/communities/api";

export async function ensureCommunityPostScopeAccess(
  params: { communityId: string; spaceId: string },
  auth: AuthContext
) {
  const svc = createServiceClient();
  const canManage = canManageCommunities(auth);

  const [communityRes, segmentsRes, spaceRes, memberships] = await Promise.all([
    svc
      .from("communities")
      .select(
        "id, org_id, visibility, segment_type, allow_unit_master_post, allow_unit_user_post"
      )
      .eq("id", params.communityId)
      .maybeSingle(),
    svc
      .from("community_segments")
      .select("community_id, org_id, target_type, target_id, created_at")
      .eq("community_id", params.communityId),
    svc
      .from("community_spaces")
      .select("id, community_id, org_id, space_type")
      .eq("id", params.spaceId)
      .eq("community_id", params.communityId)
      .maybeSingle(),
    canManage
      ? Promise.resolve({ groupIds: new Set<string>(), teamIds: new Set<string>() })
      : loadMembershipSets(svc, auth.orgId!, auth.userId),
  ]);

  if (communityRes.error) {
    throw new Error("Falha ao validar comunidade.");
  }
  if (segmentsRes.error) {
    throw new Error("Falha ao validar segmentação da comunidade.");
  }
  if (spaceRes.error) {
    throw new Error("Falha ao validar espaço.");
  }

  const community = (communityRes.data ?? null) as CommunityRow | null;
  const space = spaceRes.data ?? null;

  if (!community || community.org_id !== auth.orgId) {
    return { ok: false as const, status: 404, error: "Comunidade não encontrada." };
  }

  if (!space || space.org_id !== auth.orgId) {
    return { ok: false as const, status: 404, error: "Espaço não encontrado." };
  }

  if (space.space_type !== "publicacoes") {
    return {
      ok: false as const,
      status: 400,
      error: "Publicações só são permitidas em espaços do tipo 'publicacoes'.",
    };
  }

  const segments = (segmentsRes.data ?? []) as CommunitySegmentRow[];
  const segmentMap = buildSegmentMap(segments);
  const segmentTargetIds = (segmentMap.get(params.communityId) ?? []).map(
    (segment) => segment.target_id
  );

  const canView = canViewCommunityRecord({
    auth,
    community,
    segmentTargetIds,
    memberships,
  });

  if (!canView) {
    return {
      ok: false as const,
      status: 403,
      error: "Você não tem acesso a esta comunidade.",
    };
  }

  return { ok: true as const, svc, canManage };
}
