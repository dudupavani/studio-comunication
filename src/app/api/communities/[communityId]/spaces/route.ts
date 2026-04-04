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
import {
  communityParamsSchema,
  createCommunitySpaceSchema,
} from "@/lib/communities/validations";
import {
  buildSegmentMap,
  jsonError,
  loadMembershipSets,
  normalizeUniqueViolation,
} from "@/lib/communities/api";

async function loadCommunityScope(
  communityId: string,
  orgId: string,
  userId: string,
  canManage: boolean
) {
  const svc = createServiceClient();

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
      .select("id, community_id, org_id, name, space_type, created_by, created_at, updated_at")
      .eq("community_id", communityId)
      .order("name", { ascending: true }),
    canManage
      ? Promise.resolve({ groupIds: new Set<string>(), teamIds: new Set<string>() })
      : loadMembershipSets(svc, orgId, userId),
  ]);

  return {
    community: (communityRes.data ?? null) as CommunityRow | null,
    communityError: communityRes.error,
    segments: (segmentsRes.data ?? []) as CommunitySegmentRow[],
    segmentsError: segmentsRes.error,
    spaces: spacesRes.data ?? [],
    spacesError: spacesRes.error,
    memberships,
    svc,
  };
}

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

    const canManage = canManageCommunities(auth);

    const {
      community,
      communityError,
      segments,
      segmentsError,
      spaces,
      spacesError,
      memberships,
    } = await loadCommunityScope(communityId, auth.orgId, auth.userId, canManage);

    if (communityError) {
      return jsonError(500, "Falha ao carregar comunidade.", communityError);
    }

    if (!community || community.org_id !== auth.orgId) {
      return jsonError(404, "Comunidade não encontrada.");
    }

    if (segmentsError) {
      return jsonError(500, "Falha ao carregar segmentação da comunidade.", segmentsError);
    }

    if (spacesError) {
      return jsonError(500, "Falha ao carregar espaços da comunidade.", spacesError);
    }

    const segmentMap = buildSegmentMap(segments);
    const segmentRows = segmentMap.get(community.id) ?? [];
    const segmentTargetIds = segmentRows.map((row) => row.target_id);

    const canView = canViewCommunityRecord({
      auth,
      community,
      segmentTargetIds,
      memberships,
    });

    if (!canView) {
      return jsonError(403, "Você não tem acesso a esta comunidade.");
    }

    return NextResponse.json({
      items: spaces.map((space: any) => ({
        id: space.id,
        communityId: space.community_id,
        orgId: space.org_id,
        name: space.name,
        spaceType: space.space_type,
        createdAt: space.created_at,
        updatedAt: space.updated_at,
      })),
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao listar espaços.", error);
  }
}

export async function POST(
  req: NextRequest,
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

    const canManage = canManageCommunities(auth);
    if (!canManage) {
      return jsonError(403, "Você não tem permissão para criar espaços.");
    }

    const rawPayload = await req.json().catch(() => null);
    const parsed = createCommunitySpaceSchema.safeParse(rawPayload ?? {});

    if (!parsed.success) {
      return jsonError(400, "Dados inválidos para criar espaço.", parsed.error.flatten());
    }

    const payload = parsed.data;

    const { community, communityError, svc } = await loadCommunityScope(
      communityId,
      auth.orgId,
      auth.userId,
      canManage
    );

    if (communityError) {
      return jsonError(500, "Falha ao validar comunidade.", communityError);
    }

    if (!community || community.org_id !== auth.orgId) {
      return jsonError(404, "Comunidade não encontrada.");
    }

    const { data: insertedSpace, error: insertSpaceError } = await svc
      .from("community_spaces")
      .insert({
        community_id: communityId,
        org_id: auth.orgId,
        name: payload.name,
        space_type: payload.spaceType,
        created_by: auth.userId,
      })
      .select("id, community_id, org_id, name, space_type, created_by, created_at, updated_at")
      .maybeSingle();

    if (insertSpaceError || !insertedSpace) {
      if (insertSpaceError?.code === "23505") {
        return jsonError(409, "Já existe um espaço com este nome na comunidade.");
      }

      if (insertSpaceError?.message && normalizeUniqueViolation(insertSpaceError.message)) {
        return jsonError(409, "Já existe um espaço com este nome na comunidade.");
      }

      return jsonError(500, "Falha ao criar espaço.", insertSpaceError);
    }

    return NextResponse.json(
      {
        item: {
          id: insertedSpace.id,
          communityId: insertedSpace.community_id,
          orgId: insertedSpace.org_id,
          name: insertedSpace.name,
          spaceType: insertedSpace.space_type,
          createdAt: insertedSpace.created_at,
          updatedAt: insertedSpace.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(500, "Falha inesperada ao criar espaço.", error);
  }
}
