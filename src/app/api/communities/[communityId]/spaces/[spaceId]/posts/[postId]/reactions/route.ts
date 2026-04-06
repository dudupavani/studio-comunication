import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { ensureCommunityPostScopeAccess } from "@/lib/communities/post-access";
import {
  communitySpacePostParamsSchema,
  communityPostReactionSchema,
} from "@/lib/communities/validations";
import { jsonError } from "@/lib/communities/api";
import { getCommunityPostReactionTarget } from "@/lib/communities/post-reactions";
import {
  listReactionActorsForTarget,
  toggleTargetReaction,
} from "@/lib/reactions/core";

async function resolveReactionTarget(args: {
  communityId: string;
  spaceId: string;
  postId: string;
  orgId: string;
  svc: SupabaseClient<Database>;
}) {
  const targetId = await getCommunityPostReactionTarget({
    svc: args.svc,
    postId: args.postId,
    communityId: args.communityId,
    spaceId: args.spaceId,
    orgId: args.orgId,
  });

  if (!targetId) {
    return {
      ok: false as const,
      status: 404,
      error:
        "Reações indisponíveis para esta publicação. Atualize a página e tente novamente.",
    };
  }

  const { data: target, error: targetError } = await args.svc
    .from("reaction_targets")
    .select("id, allow_reactions")
    .eq("id", targetId)
    .eq("org_id", args.orgId)
    .maybeSingle();

  if (targetError) {
    return {
      ok: false as const,
      status: 500,
      error: "Falha ao validar alvo de reação.",
      details: targetError,
    };
  }

  if (!target) {
    return {
      ok: false as const,
      status: 404,
      error: "Alvo de reação não encontrado.",
    };
  }

  if (!target.allow_reactions) {
    return {
      ok: false as const,
      status: 400,
      error: "Esta publicação não permite reações.",
    };
  }

  return { ok: true as const, targetId };
}

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{ communityId: string; spaceId: string; postId: string }>;
  }
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

    const rawEmoji = req.nextUrl.searchParams.get("emoji");
    const parsedEmoji = communityPostReactionSchema.safeParse({
      emoji: rawEmoji ?? "👍",
    });
    if (!parsedEmoji.success) {
      return jsonError(400, "Emoji inválido.", parsedEmoji.error.flatten());
    }

    const target = await resolveReactionTarget({
      communityId: parsedParams.data.communityId,
      spaceId: parsedParams.data.spaceId,
      postId: parsedParams.data.postId,
      orgId: auth.orgId,
      svc: access.svc,
    });

    if (!target.ok) {
      return jsonError(
        target.status,
        target.error,
        "details" in target ? target.details : undefined,
      );
    }

    const actors = await listReactionActorsForTarget({
      svc: access.svc,
      targetId: target.targetId,
      orgId: auth.orgId,
      emoji: parsedEmoji.data.emoji,
    });

    return NextResponse.json({
      item: {
        emoji: parsedEmoji.data.emoji,
        count: actors.length,
        actors,
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao carregar reações da publicação.", error);
  }
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{ communityId: string; spaceId: string; postId: string }>;
  }
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

    const rawBody = await req.json().catch(() => null);
    const parsedBody = communityPostReactionSchema.safeParse(rawBody ?? {});
    if (!parsedBody.success) {
      return jsonError(400, "Emoji inválido.", parsedBody.error.flatten());
    }

    const target = await resolveReactionTarget({
      communityId: parsedParams.data.communityId,
      spaceId: parsedParams.data.spaceId,
      postId: parsedParams.data.postId,
      orgId: auth.orgId,
      svc: access.svc,
    });

    if (!target.ok) {
      return jsonError(
        target.status,
        target.error,
        "details" in target ? target.details : undefined,
      );
    }

    const result = await toggleTargetReaction({
      svc: access.svc,
      targetId: target.targetId,
      orgId: auth.orgId,
      userId: auth.userId,
      emoji: parsedBody.data.emoji,
    });

    return NextResponse.json({
      ok: true,
      removed: result.removed,
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao reagir à publicação.", error);
  }
}
