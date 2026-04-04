import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canManageCommunities } from "@/lib/communities/permissions";
import {
  communitySpaceParamsSchema,
  updateCommunitySpaceSchema,
} from "@/lib/communities/validations";
import { jsonError, normalizeUniqueViolation } from "@/lib/communities/api";

export async function PATCH(
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

    if (!canManageCommunities(auth)) {
      return jsonError(403, "Você não tem permissão para editar espaços.");
    }

    const rawPayload = await req.json().catch(() => null);
    const parsed = updateCommunitySpaceSchema.safeParse(rawPayload ?? {});

    if (!parsed.success) {
      return jsonError(400, "Dados inválidos para editar espaço.", parsed.error.flatten());
    }

    const payload = parsed.data;
    const svc = createServiceClient();

    const { data: existing, error: existingError } = await svc
      .from("community_spaces")
      .select("id, community_id, org_id")
      .eq("id", spaceId)
      .eq("community_id", communityId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Falha ao validar espaço.", existingError);
    }

    if (!existing || existing.org_id !== auth.orgId) {
      return jsonError(404, "Espaço não encontrado.");
    }

    const { data: updatedSpace, error: updateError } = await svc
      .from("community_spaces")
      .update({
        name: payload.name,
        space_type: payload.spaceType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", spaceId)
      .eq("community_id", communityId)
      .eq("org_id", auth.orgId)
      .select("id, community_id, org_id, name, space_type, created_by, created_at, updated_at")
      .maybeSingle();

    if (updateError || !updatedSpace) {
      if (updateError?.code === "23505") {
        return jsonError(409, "Já existe um espaço com este nome na comunidade.");
      }

      if (updateError?.message && normalizeUniqueViolation(updateError.message)) {
        return jsonError(409, "Já existe um espaço com este nome na comunidade.");
      }

      return jsonError(500, "Falha ao editar espaço.", updateError);
    }

    return NextResponse.json({
      item: {
        id: updatedSpace.id,
        communityId: updatedSpace.community_id,
        orgId: updatedSpace.org_id,
        name: updatedSpace.name,
        spaceType: updatedSpace.space_type,
        createdAt: updatedSpace.created_at,
        updatedAt: updatedSpace.updated_at,
      },
    });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao editar espaço.", error);
  }
}

export async function DELETE(
  _req: NextRequest,
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

    if (!canManageCommunities(auth)) {
      return jsonError(403, "Você não tem permissão para remover espaços.");
    }

    const svc = createServiceClient();

    const { data: existing, error: existingError } = await svc
      .from("community_spaces")
      .select("id, community_id, org_id")
      .eq("id", spaceId)
      .eq("community_id", communityId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Falha ao validar espaço.", existingError);
    }

    if (!existing || existing.org_id !== auth.orgId) {
      return jsonError(404, "Espaço não encontrado.");
    }

    const { error: deleteError } = await svc
      .from("community_spaces")
      .delete()
      .eq("id", spaceId)
      .eq("community_id", communityId)
      .eq("org_id", auth.orgId);

    if (deleteError) {
      return jsonError(500, "Falha ao remover espaço.", deleteError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Falha inesperada ao remover espaço.", error);
  }
}
