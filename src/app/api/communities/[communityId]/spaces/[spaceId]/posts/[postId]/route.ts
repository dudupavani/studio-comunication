import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  communitySpacePostParamsSchema,
  createCommunitySpacePostSchema,
} from "@/lib/communities/validations";
import { jsonError } from "@/lib/communities/api";
import { ensureCommunityPostScopeAccess } from "@/lib/communities/post-access";
import { buildCommunityPostReactionSummaryByPost } from "@/lib/communities/post-reactions";
import { getEmptyReactionSummary } from "@/lib/reactions/core";

const POSTS_BUCKET = "posts";
const SIGNED_URL_TTL_IN_SECONDS = 60 * 60;

function canMutatePost(args: {
  canManage: boolean;
  postAuthorId: string | null;
  userId: string;
}) {
  if (args.canManage) return true;
  return !!args.postAuthorId && args.postAuthorId === args.userId;
}

function collectPostStoragePaths(post: { cover_path: string | null; blocks: unknown }) {
  const paths = new Set<string>();

  if (post.cover_path) {
    paths.add(post.cover_path);
  }

  if (!Array.isArray(post.blocks)) {
    return Array.from(paths);
  }

  for (const block of post.blocks) {
    if (!block || typeof block !== "object") continue;
    const item = block as Record<string, unknown>;

    const imagePath = typeof item.imagePath === "string" ? item.imagePath : null;
    const filePath = typeof item.filePath === "string" ? item.filePath : null;

    if (imagePath) paths.add(imagePath);
    if (filePath) paths.add(filePath);
  }

  return Array.from(paths);
}

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
        console.error("COMMUNITY_POST_SIGNED_URL_ERROR", error);
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
    console.error("COMMUNITY_POST_SIGNED_URL_UNEXPECTED_ERROR", error);
    return new Map<string, string>();
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ communityId: string; spaceId: string; postId: string }> },
) {
  try {
    const parsedParams = communitySpacePostParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const access = await ensureCommunityPostScopeAccess(parsedParams.data, auth);
    if (!access.ok) {
      return jsonError(access.status, access.error);
    }

    const { postId, communityId, spaceId } = parsedParams.data;
    const { data: post, error: postError } = await access.svc
      .from("community_space_posts")
      .select(
        "id, community_id, space_id, org_id, title, cover_path, cover_url, blocks, created_by, created_at, profiles!created_by(full_name, avatar_url)",
      )
      .eq("id", postId)
      .eq("community_id", communityId)
      .eq("space_id", spaceId)
      .maybeSingle();

    if (postError) {
      return jsonError(500, "Falha ao carregar publicação.", postError);
    }
    if (!post) {
      return jsonError(404, "Publicação não encontrada.");
    }

    const storagePaths = collectPostStoragePaths({
      cover_path: post.cover_path ?? null,
      blocks: post.blocks,
    });
    const signedUrlMap = await createSignedUrlMapForPaths(access.svc, storagePaths);
    const normalizedBlocks = Array.isArray(post.blocks)
      ? post.blocks.map((block) => {
          if (!block || typeof block !== "object") return block;
          const item = block as Record<string, unknown>;

          if (
            item.type === "image" &&
            typeof item.imagePath === "string" &&
            signedUrlMap.has(item.imagePath)
          ) {
            return { ...item, imageUrl: signedUrlMap.get(item.imagePath) };
          }

          if (
            item.type === "attachment" &&
            typeof item.filePath === "string" &&
            signedUrlMap.has(item.filePath)
          ) {
            return { ...item, fileUrl: signedUrlMap.get(item.filePath) };
          }

          return item;
        })
      : [];

    let reactions = getEmptyReactionSummary();
    try {
      const summaryByPost = await buildCommunityPostReactionSummaryByPost({
        svc: access.svc,
        postIds: [post.id],
        orgId: auth.orgId,
        userId: auth.userId,
      });
      reactions = summaryByPost.get(post.id) ?? getEmptyReactionSummary();
    } catch (error) {
      console.error("COMMUNITY_POST_REACTIONS_LOAD_ERROR", error);
    }

    return NextResponse.json({
      item: {
        id: post.id,
        communityId: post.community_id,
        spaceId: post.space_id,
        orgId: post.org_id ?? auth.orgId,
        createdBy: post.created_by,
        authorName: post.profiles?.full_name ?? null,
        authorAvatarUrl: post.profiles?.avatar_url ?? null,
        createdAt: post.created_at,
        title: post.title,
        coverPath: post.cover_path ?? null,
        coverUrl:
          (post.cover_path ? signedUrlMap.get(post.cover_path) ?? null : null) ??
          post.cover_url ??
          null,
        blocks: normalizedBlocks,
        reactions,
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao carregar publicação.", error);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ communityId: string; spaceId: string; postId: string }> },
) {
  try {
    const parsedParams = communitySpacePostParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const access = await ensureCommunityPostScopeAccess(parsedParams.data, auth);
    if (!access.ok) {
      return jsonError(access.status, access.error);
    }

    const rawPayload = await req.json().catch(() => null);
    const parsedBody = createCommunitySpacePostSchema.safeParse(rawPayload ?? {});

    if (!parsedBody.success) {
      return jsonError(400, "Dados inválidos para atualizar publicação.", parsedBody.error.flatten());
    }

    const { postId, communityId, spaceId } = parsedParams.data;
    const { data: existingPost, error: existingError } = await access.svc
      .from("community_space_posts")
      .select("id, created_by")
      .eq("id", postId)
      .eq("community_id", communityId)
      .eq("space_id", spaceId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Falha ao validar publicação.", existingError);
    }
    if (!existingPost) {
      return jsonError(404, "Publicação não encontrada.");
    }

    if (!canMutatePost({
      canManage: access.canManage,
      postAuthorId: existingPost.created_by,
      userId: auth.userId,
    })) {
      return jsonError(403, "Você não tem permissão para editar esta publicação.");
    }

    const payload = parsedBody.data;
    const { data: updated, error: updateError } = await access.svc
      .from("community_space_posts")
      .update({
        org_id: auth.orgId,
        title: payload.title,
        cover_path: payload.coverPath ?? null,
        cover_url: payload.coverUrl ?? null,
        blocks: payload.blocks as any,
      })
      .eq("id", postId)
      .eq("community_id", communityId)
      .eq("space_id", spaceId)
      .select("id, community_id, space_id, org_id, title, cover_url, created_by, created_at, updated_at")
      .maybeSingle();

    if (updateError || !updated) {
      return jsonError(500, "Falha ao atualizar publicação.", updateError);
    }

    return NextResponse.json({
      item: {
        id: updated.id,
        communityId: updated.community_id,
        spaceId: updated.space_id,
        orgId: updated.org_id,
        title: updated.title,
        coverUrl: updated.cover_url,
        createdBy: updated.created_by,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao atualizar publicação.", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ communityId: string; spaceId: string; postId: string }> },
) {
  try {
    const parsedParams = communitySpacePostParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const userSupabase = createServerClientWithCookies();
    const auth = await getAuthContext(userSupabase);

    if (!auth) {
      return jsonError(401, "Sessão inválida.");
    }

    if (!auth.orgId) {
      return jsonError(400, "Não foi possível determinar a organização ativa.");
    }

    const access = await ensureCommunityPostScopeAccess(parsedParams.data, auth);
    if (!access.ok) {
      return jsonError(access.status, access.error);
    }

    const { postId, communityId, spaceId } = parsedParams.data;
    const { data: existingPost, error: existingError } = await access.svc
      .from("community_space_posts")
      .select("id, created_by, cover_path, blocks")
      .eq("id", postId)
      .eq("community_id", communityId)
      .eq("space_id", spaceId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Falha ao validar publicação.", existingError);
    }
    if (!existingPost) {
      return jsonError(404, "Publicação não encontrada.");
    }

    if (!canMutatePost({
      canManage: access.canManage,
      postAuthorId: existingPost.created_by,
      userId: auth.userId,
    })) {
      return jsonError(403, "Você não tem permissão para excluir esta publicação.");
    }

    const { error: deleteError } = await access.svc
      .from("community_space_posts")
      .delete()
      .eq("id", postId)
      .eq("community_id", communityId)
      .eq("space_id", spaceId);

    if (deleteError) {
      return jsonError(500, "Falha ao excluir publicação.", deleteError);
    }

    const storagePaths = collectPostStoragePaths(existingPost);
    if (storagePaths.length > 0) {
      const { error: storageError } = await access.svc.storage
        .from(POSTS_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        console.error("COMMUNITY_POST_DELETE_STORAGE_CLEANUP_ERROR", storageError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao excluir publicação.", error);
  }
}
