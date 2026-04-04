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
  communityParamsSchema,
  updateCommunitySchema,
} from "@/lib/communities/validations";
import {
  buildSegmentMap,
  jsonError,
  loadMembershipSets,
  normalizeUniqueViolation,
  type TypedSupabaseClient,
} from "@/lib/communities/api";

async function loadCommunityBundle(
  svc: TypedSupabaseClient,
  communityId: string
) {
  const [communityRes, segmentsRes, spacesRes] = await Promise.all([
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
  ]);

  return {
    community: (communityRes.data ?? null) as CommunityRow | null,
    communityError: communityRes.error,
    segments: (segmentsRes.data ?? []) as CommunitySegmentRow[],
    segmentsError: segmentsRes.error,
    spaces: spacesRes.data ?? [],
    spacesError: spacesRes.error,
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ communityId: string }> }
) {
  try {
    const paramsParsed = communityParamsSchema.safeParse(await context.params);
    if (!paramsParsed.success) {
      return jsonError(400, "Parâmetros inválidos.", paramsParsed.error.flatten());
    }

    const { communityId } = paramsParsed.data;

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

    const { community, communityError, segments, segmentsError, spaces, spacesError } =
      await loadCommunityBundle(svc, communityId);

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

    const memberships = canManage
      ? { groupIds: new Set<string>(), teamIds: new Set<string>() }
      : await loadMembershipSets(svc, auth.orgId, auth.userId);

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
      item: {
        id: community.id,
        orgId: community.org_id,
        name: community.name,
        visibility: community.visibility,
        segmentType: community.segment_type,
        segmentTargetIds,
        allowUnitMasterPost: community.allow_unit_master_post,
        allowUnitUserPost: community.allow_unit_user_post,
        canManage,
        canPost: canPostInCommunity(auth, community),
        createdAt: community.created_at,
        updatedAt: community.updated_at,
        spaces: spaces.map((space: any) => ({
          id: space.id,
          communityId: space.community_id,
          orgId: space.org_id,
          name: space.name,
          spaceType: space.space_type,
          createdAt: space.created_at,
          updatedAt: space.updated_at,
        })),
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao carregar comunidade.", error);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ communityId: string }> }
) {
  try {
    const paramsParsed = communityParamsSchema.safeParse(await context.params);
    if (!paramsParsed.success) {
      return jsonError(400, "Parâmetros inválidos.", paramsParsed.error.flatten());
    }

    const { communityId } = paramsParsed.data;

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
      return jsonError(403, "Você não tem permissão para editar comunidades.");
    }

    const rawPayload = await req.json().catch(() => null);
    const parsed = updateCommunitySchema.safeParse(rawPayload ?? {});

    if (!parsed.success) {
      return jsonError(400, "Dados inválidos para editar comunidade.", parsed.error.flatten());
    }

    const payload = parsed.data;
    const segmentTargetIds = Array.from(new Set(payload.segmentTargetIds ?? []));
    const normalizedSegmentType =
      payload.visibility === "segmented" ? payload.segmentType ?? null : null;

    const svc = createServiceClient();

    const { data: existing, error: existingError } = await svc
      .from("communities")
      .select("id, org_id")
      .eq("id", communityId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Falha ao validar comunidade.", existingError);
    }

    if (!existing || existing.org_id !== auth.orgId) {
      return jsonError(404, "Comunidade não encontrada.");
    }

    const { data: updatedCommunity, error: updateCommunityError } = await svc
      .from("communities")
      .update({
        name: payload.name,
        visibility: payload.visibility,
        segment_type: normalizedSegmentType,
        allow_unit_master_post: payload.allowUnitMasterPost,
        allow_unit_user_post: payload.allowUnitUserPost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", communityId)
      .eq("org_id", auth.orgId)
      .select(
        "id, org_id, name, visibility, segment_type, allow_unit_master_post, allow_unit_user_post, created_by, created_at, updated_at"
      )
      .maybeSingle();

    if (updateCommunityError || !updatedCommunity) {
      if (updateCommunityError?.code === "23505") {
        return jsonError(409, "Já existe uma comunidade com este nome.");
      }

      if (
        updateCommunityError?.message &&
        normalizeUniqueViolation(updateCommunityError.message)
      ) {
        return jsonError(409, "Já existe uma comunidade com este nome.");
      }

      return jsonError(500, "Falha ao atualizar comunidade.", updateCommunityError);
    }

    const { error: deleteSegmentsError } = await svc
      .from("community_segments")
      .delete()
      .eq("community_id", communityId);

    if (deleteSegmentsError) {
      return jsonError(500, "Falha ao atualizar segmentação da comunidade.", deleteSegmentsError);
    }

    if (payload.visibility === "segmented" && normalizedSegmentType) {
      const segmentRows = segmentTargetIds.map((targetId) => ({
        community_id: communityId,
        org_id: auth.orgId!,
        target_type: normalizedSegmentType,
        target_id: targetId,
      }));

      if (segmentRows.length > 0) {
        const { error: insertSegmentsError } = await svc
          .from("community_segments")
          .insert(segmentRows);

        if (insertSegmentsError) {
          return jsonError(
            500,
            "Falha ao persistir a segmentação da comunidade.",
            insertSegmentsError
          );
        }
      }
    }

    const { spaces } = await loadCommunityBundle(svc, communityId);

    return NextResponse.json({
      item: {
        id: updatedCommunity.id,
        orgId: updatedCommunity.org_id,
        name: updatedCommunity.name,
        visibility: updatedCommunity.visibility,
        segmentType: updatedCommunity.segment_type,
        segmentTargetIds,
        allowUnitMasterPost: updatedCommunity.allow_unit_master_post,
        allowUnitUserPost: updatedCommunity.allow_unit_user_post,
        canManage,
        canPost: canPostInCommunity(auth, updatedCommunity),
        createdAt: updatedCommunity.created_at,
        updatedAt: updatedCommunity.updated_at,
        spaces: spaces.map((space: any) => ({
          id: space.id,
          communityId: space.community_id,
          orgId: space.org_id,
          name: space.name,
          spaceType: space.space_type,
          createdAt: space.created_at,
          updatedAt: space.updated_at,
        })),
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao atualizar comunidade.", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ communityId: string }> }
) {
  try {
    const paramsParsed = communityParamsSchema.safeParse(await context.params);
    if (!paramsParsed.success) {
      return jsonError(400, "Parâmetros inválidos.", paramsParsed.error.flatten());
    }

    const { communityId } = paramsParsed.data;

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
      return jsonError(403, "Você não tem permissão para remover comunidades.");
    }

    const svc = createServiceClient();

    const { data: existing, error: existingError } = await svc
      .from("communities")
      .select("id, org_id")
      .eq("id", communityId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Falha ao validar comunidade.", existingError);
    }

    if (!existing || existing.org_id !== auth.orgId) {
      return jsonError(404, "Comunidade não encontrada.");
    }

    const { error: deleteError } = await svc
      .from("communities")
      .delete()
      .eq("id", communityId)
      .eq("org_id", auth.orgId);

    if (deleteError) {
      return jsonError(500, "Falha ao remover comunidade.", deleteError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao remover comunidade.", error);
  }
}
