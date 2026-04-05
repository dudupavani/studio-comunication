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

const POSTS_BUCKET = "posts";
const SIGNED_URL_TTL_IN_SECONDS = 60 * 60;

async function createSignedUrlMapForPaths(
  svc: ReturnType<typeof createServiceClient>,
  paths: string[],
) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) {
    return new Map<string, string>();
  }

  try {
    const { data, error } = await svc.storage
      .from(POSTS_BUCKET)
      .createSignedUrls(uniquePaths, SIGNED_URL_TTL_IN_SECONDS);

    if (error || !data) {
      if (error) {
        console.error("COMMUNITY_FEED_SIGNED_URL_ERROR", error);
      }
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    for (const item of data) {
      if (item.path && item.signedUrl) {
        map.set(item.path, item.signedUrl);
      }
    }
    return map;
  } catch (error) {
    console.error("COMMUNITY_FEED_SIGNED_URL_UNEXPECTED_ERROR", error);
    return new Map<string, string>();
  }
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

    const publicationSpaceIds = visibleSpaces
      .filter((s) => s.spaceType === "publicacoes")
      .map((s) => s.id);

    const spaceNameById = new Map(visibleSpaces.map((s) => [s.id, s.name]));

    let feedItems: any[] = [];

    if (publicationSpaceIds.length > 0) {
      const postsRes = await svc
        .from("community_space_posts")
        .select(
          "id, community_id, space_id, title, cover_path, cover_url, created_at, created_by, blocks, profiles(full_name)"
        )
        .eq("community_id", communityId)
        .in("space_id", publicationSpaceIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!postsRes.error && postsRes.data) {
        const coverUrlMap = await createSignedUrlMapForPaths(
          svc,
          postsRes.data
            .map((post: any) =>
              typeof post.cover_path === "string" ? post.cover_path : "",
            )
            .filter(Boolean),
        );

        feedItems = postsRes.data.map((post: any) => {
          const firstTextBlock = (post.blocks ?? []).find(
            (b: any) => b.type === "text" && typeof b.content === "string"
          );
          const excerpt = firstTextBlock
            ? (firstTextBlock.content as string).slice(0, 200).trim() || null
            : null;

          return {
            id: post.id,
            communityId: post.community_id,
            spaceId: post.space_id,
            spaceName: spaceNameById.get(post.space_id) ?? null,
            authorId: post.created_by ?? null,
            title: post.title ?? null,
            excerpt,
            coverUrl:
              (post.cover_path
                ? coverUrlMap.get(post.cover_path) ?? null
                : null) ??
              post.cover_url ??
              null,
            authorName: post.profiles?.full_name ?? null,
            createdAt: post.created_at,
          };
        });
      }
    }

    return NextResponse.json({
      item: {
        communityId,
        visibleSpaceIds: visibleSpaces.map((space) => space.id),
        spaces: visibleSpaces,
        items: feedItems,
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao carregar feed da comunidade.", error);
  }
}
