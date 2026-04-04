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
import { createCommunitySchema } from "@/lib/communities/validations";
import {
  buildSegmentMap,
  jsonError,
  loadMembershipSets,
  normalizeUniqueViolation,
} from "@/lib/communities/api";

export async function GET(req: NextRequest) {
  try {
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

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    let communitiesQuery = svc
      .from("communities")
      .select(
        "id, org_id, name, visibility, segment_type, allow_unit_master_post, allow_unit_user_post, created_by, created_at, updated_at"
      )
      .eq("org_id", auth.orgId)
      .order("name", { ascending: true });

    if (q) {
      const like = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
      communitiesQuery = communitiesQuery.ilike("name", like);
    }

    const { data: communitiesData, error: communitiesError } =
      await communitiesQuery;

    if (communitiesError) {
      return jsonError(500, "Falha ao listar comunidades.", communitiesError);
    }

    const communities = (communitiesData ?? []) as CommunityRow[];
    if (!communities.length) {
      return NextResponse.json({ items: [] });
    }

    const communityIds = communities.map((community) => community.id);

    const [segmentsRes, spacesRes, memberships] = await Promise.all([
      svc
        .from("community_segments")
        .select("community_id, org_id, target_type, target_id, created_at")
        .in("community_id", communityIds),
      svc.from("community_spaces").select("community_id").in("community_id", communityIds),
      canManage
        ? Promise.resolve({ groupIds: new Set<string>(), teamIds: new Set<string>() })
        : loadMembershipSets(svc, auth.orgId, auth.userId),
    ]);

    if (segmentsRes.error) {
      return jsonError(500, "Falha ao carregar segmentação das comunidades.", segmentsRes.error);
    }

    if (spacesRes.error) {
      return jsonError(500, "Falha ao carregar espaços das comunidades.", spacesRes.error);
    }

    const segments = (segmentsRes.data ?? []) as CommunitySegmentRow[];
    const segmentMap = buildSegmentMap(segments);

    const spacesCountMap = new Map<string, number>();
    (spacesRes.data ?? []).forEach((row: any) => {
      const communityId = row.community_id as string | null;
      if (!communityId) return;
      spacesCountMap.set(communityId, (spacesCountMap.get(communityId) ?? 0) + 1);
    });

    const items = communities
      .filter((community) => {
        const communitySegments = segmentMap.get(community.id) ?? [];
        const segmentTargetIds = communitySegments.map((segment) => segment.target_id);

        return canViewCommunityRecord({
          auth,
          community,
          segmentTargetIds,
          memberships,
        });
      })
      .map((community) => {
        const communitySegments = segmentMap.get(community.id) ?? [];
        const segmentTargetIds = communitySegments.map((segment) => segment.target_id);

        return {
          id: community.id,
          orgId: community.org_id,
          name: community.name,
          visibility: community.visibility,
          segmentType: community.segment_type,
          segmentTargetIds,
          allowUnitMasterPost: community.allow_unit_master_post,
          allowUnitUserPost: community.allow_unit_user_post,
          spacesCount: spacesCountMap.get(community.id) ?? 0,
          canManage,
          canPost: canPostInCommunity(auth, community),
          createdAt: community.created_at,
          updatedAt: community.updated_at,
        };
      });

    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao listar comunidades.", error);
  }
}

export async function POST(req: NextRequest) {
  try {
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
      return jsonError(403, "Você não tem permissão para criar comunidades.");
    }

    const rawPayload = await req.json().catch(() => null);
    const parsed = createCommunitySchema.safeParse(rawPayload ?? {});

    if (!parsed.success) {
      return jsonError(400, "Dados inválidos para criar comunidade.", parsed.error.flatten());
    }

    const payload = parsed.data;
    const segmentTargetIds = Array.from(new Set(payload.segmentTargetIds ?? []));
    const normalizedSegmentType =
      payload.visibility === "segmented" ? payload.segmentType ?? null : null;

    const svc = createServiceClient();

    const { data: insertedCommunity, error: insertCommunityError } = await svc
      .from("communities")
      .insert({
        org_id: auth.orgId,
        name: payload.name,
        visibility: payload.visibility,
        segment_type: normalizedSegmentType,
        allow_unit_master_post: payload.allowUnitMasterPost,
        allow_unit_user_post: payload.allowUnitUserPost,
        created_by: auth.userId,
      })
      .select(
        "id, org_id, name, visibility, segment_type, allow_unit_master_post, allow_unit_user_post, created_by, created_at, updated_at"
      )
      .maybeSingle();

    if (insertCommunityError || !insertedCommunity) {
      if (insertCommunityError?.code === "23505") {
        return jsonError(409, "Já existe uma comunidade com este nome.");
      }

      if (
        insertCommunityError?.message &&
        normalizeUniqueViolation(insertCommunityError.message)
      ) {
        return jsonError(409, "Já existe uma comunidade com este nome.");
      }

      return jsonError(500, "Não foi possível criar a comunidade.", insertCommunityError);
    }

    if (payload.visibility === "segmented" && normalizedSegmentType) {
      const segmentRows = segmentTargetIds.map((targetId) => ({
        community_id: insertedCommunity.id,
        org_id: auth.orgId!,
        target_type: normalizedSegmentType,
        target_id: targetId,
      }));

      if (segmentRows.length > 0) {
        const { error: segmentsInsertError } = await svc
          .from("community_segments")
          .insert(segmentRows);

        if (segmentsInsertError) {
          await svc.from("communities").delete().eq("id", insertedCommunity.id);
          return jsonError(
            500,
            "Falha ao salvar a segmentação da comunidade.",
            segmentsInsertError
          );
        }
      }
    }

    return NextResponse.json(
      {
        item: {
          id: insertedCommunity.id,
          orgId: insertedCommunity.org_id,
          name: insertedCommunity.name,
          visibility: insertedCommunity.visibility,
          segmentType: insertedCommunity.segment_type,
          segmentTargetIds,
          allowUnitMasterPost: insertedCommunity.allow_unit_master_post,
          allowUnitUserPost: insertedCommunity.allow_unit_user_post,
          canManage,
          canPost: canPostInCommunity(auth, insertedCommunity),
          createdAt: insertedCommunity.created_at,
          updatedAt: insertedCommunity.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(500, "Falha inesperada ao criar comunidade.", error);
  }
}
