// src/lib/actions/create-user-as-admin.ts
"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminById } from "@/lib/supabase/rpc";

type AppRole = "platform_admin" | "org_admin" | "unit_master" | "unit_user";

export const CreateUserAsAdminSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  org_id: z.string().uuid("org_id inválido"),
  org_role: z.enum(["org_admin"]).nullish(), // apenas se escolher
  unit_id: z.string().uuid().nullish(),
  unit_role: z.enum(["unit_master"]).nullish(), // apenas se escolher
  mode: z.enum(["invite", "create"]).default("invite"),
});

export type CreateUserAsAdminInput = z.infer<typeof CreateUserAsAdminSchema>;
export type CreateUserAsAdminResult =
  | { ok: true; user_id: string }
  | { ok: false; error: string; details?: unknown };

export async function createUserAsAdmin(
  rawInput: unknown
): Promise<CreateUserAsAdminResult> {
  const parsed = CreateUserAsAdminSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Payload inválido",
      details: parsed.error.flatten(),
    };
  }
  const input = parsed.data;

  // Proteção: nunca aceitar platform_admin via app
  if (
    (rawInput as any)?.role === "platform_admin" ||
    (rawInput as any)?.org_role === "platform_admin" ||
    (rawInput as any)?.unit_role === "platform_admin"
  ) {
    return {
      ok: false,
      error: "role 'platform_admin' é proibida pela aplicação",
    };
  }

  const supaRsc = await createClient();
  const svc = createServiceClient();

  const {
    data: { user: sessionUser },
  } = await supaRsc.auth.getUser();
  if (!sessionUser) {
    return { ok: false, error: "Não autenticado" };
  }

  // (Opcional) Permissão de quem cria
  const { data: isRequesterPlatformAdmin, error: rpcErr } = await supaRsc.rpc(
    "is_platform_admin"
  );
  if (rpcErr) return { ok: false, error: "Falha ao validar permissões" };

  let createdUserId: string | null = null;
  let createdNow = false;

  // Define roles corretamente:
  const profileRole: AppRole =
    input.org_role === "org_admin"
      ? "org_admin"
      : input.unit_role === "unit_master"
      ? "unit_master"
      : "unit_user";

  const orgMemberRole: AppRole =
    input.org_role === "org_admin" ? "org_admin" : "unit_user";

  const unitMemberRole: AppRole =
    input.unit_role === "unit_master" ? "unit_master" : "unit_user";

  try {
    // 1) Criação/convite no Auth
    if (input.mode === "invite") {
      const { data, error } = await svc.auth.admin.inviteUserByEmail(
        input.email,
        {
          data: { name: input.name },
        }
      );

      if (error) {
        const looksExisting =
          (error.status ?? 0) === 422 ||
          (error.status ?? 0) === 409 ||
          (error.message ?? "").toLowerCase().includes("already") ||
          (error.message ?? "").toLowerCase().includes("registered");

        if (looksExisting) {
          const { data: profileByEmail } = await svc
            .from("profiles")
            .select("id")
            .ilike("email", input.email)
            .maybeSingle();

          if (!profileByEmail?.id) {
            return {
              ok: false,
              error:
                "Usuário parece existir, mas não foi encontrado no profiles.",
              details: error,
            };
          }
          createdUserId = profileByEmail.id;
          createdNow = false;
        } else {
          return {
            ok: false,
            error: "Erro ao convidar usuário",
            details: error,
          };
        }
      } else {
        createdUserId = data?.user?.id ?? null;
        createdNow = true;
      }
    } else {
      const { data, error } = await svc.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        user_metadata: { name: input.name },
      });
      if (error || !data?.user?.id) {
        return { ok: false, error: "Erro ao criar usuário", details: error };
      }
      createdUserId = data.user.id;
      createdNow = true;
    }

    if (!createdUserId) {
      return { ok: false, error: "Falha ao obter ID do usuário" };
    }

    // 2) profiles (upsert) com role correta
    const { error: upsertProfileErr } = await svc.from("profiles").upsert(
      {
        id: createdUserId,
        email: input.email,
        name: input.name,
        role: profileRole,
      },
      { onConflict: "id" }
    );
    if (upsertProfileErr) {
      throw new Error(`Erro no profiles: ${upsertProfileErr.message}`);
    }

    // 3) org_members
    const { error: orgInsertErr } = await svc.from("org_members").insert({
      org_id: input.org_id,
      user_id: createdUserId,
      role: orgMemberRole,
    });
    if (orgInsertErr) {
      throw new Error(
        `Erro ao vincular na organização: ${orgInsertErr.message}`
      );
    }

    // 4) unit_members (se houver unit_id)
    if (input.unit_id) {
      const { error: unitInsertErr } = await svc.from("unit_members").insert({
        unit_id: input.unit_id,
        org_id: input.org_id,
        user_id: createdUserId,
        role: unitMemberRole,
      });
      if (unitInsertErr) {
        throw new Error(
          `Erro ao vincular na unidade: ${unitInsertErr.message}`
        );
      }
    }

    return { ok: true, user_id: createdUserId };
  } catch (err: any) {
    // Rollback seguro
    if (createdNow && createdUserId) {
      try {
        const isPlatAdmin =
          (await isPlatformAdminById(createdUserId).then((r) => r ?? false)) ||
          false;
        if (!isPlatAdmin) {
          await svc.auth.admin.deleteUser(createdUserId);
        }
      } catch {}
    }
    return {
      ok: false,
      error: err?.message ?? "Erro ao criar usuário",
      details: err,
    };
  }
}
