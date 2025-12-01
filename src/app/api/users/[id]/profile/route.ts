import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";
import { revalidatePath } from "next/cache";

const ParamsSchema = z.object({ id: z.string().uuid() });

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

async function resolveParams<T = any>(ctx: unknown): Promise<T> {
  const resolved = await Promise.resolve(ctx as any);
  return (resolved?.params ?? resolved) as T;
}

export async function PUT(
  req: Request,
  ctx: { params: { id: string } } | Promise<{ params: { id: string } }>
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return jsonError(401, "É preciso estar autenticado.");
    }
    if (!canManageUsers(auth)) {
      return jsonError(403, "Apenas gestores podem editar perfis de colaboradores.");
    }
    if (!auth.orgId) {
      return jsonError(400, "Organização ativa não encontrada para o usuário.");
    }

    const rawParams = await resolveParams<{ id: string }>(ctx);
    const parsedParams = ParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    const targetUserId = parsedParams.data.id;
    const orgId = auth.orgId;

    const formData = await req.formData();
    const rawName = formData.get("name");
    const phone = (formData.get("phone") as string | null) ?? null;
    const avatarInput = formData.get("avatar");
    const name =
      typeof rawName === "string" ? rawName.trim() : (rawName as string | null);

    if (!name) {
      return jsonError(400, "Nome é obrigatório.");
    }

    const supabase = createServiceClient();

    const [{ data: membership, error: membershipErr }, { data: profileRow, error: profileErr }] =
      await Promise.all([
        supabase
          .from("org_members")
          .select("org_id, role")
          .eq("org_id", orgId)
          .eq("user_id", targetUserId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("global_role, avatar_url, phone, full_name")
          .eq("id", targetUserId)
          .maybeSingle(),
      ]);

    if (membershipErr) {
      return jsonError(
        500,
        "Erro ao validar participação do colaborador na organização.",
        toLoggableError(membershipErr)
      );
    }
    if (!membership) {
      return jsonError(404, "Colaborador não encontrado nesta organização.");
    }
    if (profileErr) {
      return jsonError(
        500,
        "Erro ao carregar dados do colaborador.",
        toLoggableError(profileErr)
      );
    }
    if (profileRow?.global_role === "platform_admin") {
      return jsonError(
        403,
        "Não é permitido editar o perfil de um platform_admin por esta rota."
      );
    }

    let avatarUrl: string | null | undefined = undefined;

    if (avatarInput && avatarInput !== "REMOVE" && typeof avatarInput !== "string") {
      const file = avatarInput as File;
      if (file.size > 0) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`${targetUserId}/avatar.jpg`, file, { upsert: true });

        if (uploadError) {
          return jsonError(500, "Falha ao enviar a imagem.", toLoggableError(uploadError));
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path);

        if (publicUrlData?.publicUrl) {
          avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        }
      }
    } else if (avatarInput === "REMOVE") {
      const { error: removeError } = await supabase.storage
        .from("avatars")
        .remove([`${targetUserId}/avatar.jpg`]);
      if (removeError) {
        return jsonError(
          500,
          "Falha ao remover a imagem.",
          toLoggableError(removeError)
        );
      }
      avatarUrl = null;
    }

    const authPayload: { user_metadata: Record<string, any> } = { user_metadata: {} };
    if (name) authPayload.user_metadata.name = name;
    if (typeof avatarUrl !== "undefined") {
      authPayload.user_metadata.avatar_url = avatarUrl;
    }

    if (Object.keys(authPayload.user_metadata).length > 0) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(
        targetUserId,
        authPayload
      );
      if (authErr) {
        return jsonError(
          500,
          "Erro ao atualizar credenciais do usuário.",
          toLoggableError(authErr)
        );
      }
    }

    const updatePayload: Record<string, unknown> = {
      full_name: name,
      phone,
      updated_at: new Date().toISOString(),
    };
    if (typeof avatarUrl !== "undefined") {
      updatePayload.avatar_url = avatarUrl;
    }

    const { error: profileUpdateErr } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", targetUserId);

    if (profileUpdateErr) {
      return jsonError(
        500,
        "Erro ao salvar dados pessoais.",
        toLoggableError(profileUpdateErr)
      );
    }

    revalidatePath("/users");
    revalidatePath(`/users/${targetUserId}/edit`);

    return NextResponse.json({
      ok: true,
      profile: {
        id: targetUserId,
        fullName: name,
        phone,
        avatarUrl: typeof avatarUrl === "undefined" ? profileRow?.avatar_url ?? null : avatarUrl,
      },
    });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao atualizar dados pessoais.",
      toLoggableError(error)
    );
  }
}
