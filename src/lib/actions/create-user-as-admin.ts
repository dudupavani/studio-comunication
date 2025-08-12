// src/lib/actions/create-user-as-admin.ts
"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminById } from "@/lib/supabase/rpc";

// Roles permitidas pela aplicação (NUNCA "platform_admin" via app)
const APP_ROLES = ["org_admin", "unit_master", "unit_user"] as const;
type AppRole = (typeof APP_ROLES)[number];

export const CreateUserAsAdminSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  org_id: z.string().uuid("org_id inválido"),
  // vínculo na organização (opcional, padrão: unit_user)
  org_role: z.enum(["org_admin"]).nullish(),
  // vínculo na unidade (opcional)
  unit_id: z.string().uuid().nullish(),
  unit_role: z.enum(["unit_master"]).nullish(),
  // Modo de criação: convite (padrão) ou criação direta
  mode: z.enum(["invite", "create"]).default("invite"),
});

export type CreateUserAsAdminInput = z.infer<typeof CreateUserAsAdminSchema>;

export type CreateUserAsAdminResult =
  | { ok: true; user_id: string }
  | { ok: false; error: string; details?: unknown };

export async function createUserAsAdmin(
  rawInput: unknown
): Promise<CreateUserAsAdminResult> {
  // valida payload
  const parsed = CreateUserAsAdminSchema.safeParse(rawInput);
  if (!parsed.success) {
    console.warn("[createUserAsAdmin] Zod invalid:", parsed.error.flatten());
    return {
      ok: false,
      error: "Payload inválido",
      details: parsed.error.flatten(),
    };
  }
  const input = parsed.data;

  // Proteção extra: nunca aceitar platform_admin via app (mesmo que tentem)
  if (
    // @ts-expect-error checagem defensiva caso alguém tente injetar
    (rawInput as any)?.role === "platform_admin" ||
    // @ts-expect-error idem
    (rawInput as any)?.org_role === "platform_admin" ||
    // @ts-expect-error idem
    (rawInput as any)?.unit_role === "platform_admin"
  ) {
    console.warn(
      "[createUserAsAdmin] Tentativa de usar platform_admin via app."
    );
    return {
      ok: false,
      error: "role 'platform_admin' é proibida pela aplicação",
    };
  }

  const supaRsc = await createClient(); // cliente de sessão (server-side)
  const svc = createServiceClient(); // service role

  // Garante que quem chama está autenticado
  const {
    data: { user: sessionUser },
    error: authErr,
  } = await supaRsc.auth.getUser();
  if (!sessionUser) {
    console.warn("[createUserAsAdmin] Não autenticado:", authErr);
    return { ok: false, error: "Não autenticado" };
  }

  // (Opcional) Validação de permissão de quem está criando
  const { data: isRequesterPlatformAdmin, error: rpcErr } = await supaRsc.rpc(
    "is_platform_admin"
  );
  if (rpcErr) {
    console.error("[createUserAsAdmin] Falha ao validar permissões:", rpcErr);
    return { ok: false, error: "Falha ao validar permissões" };
  }
  // Aqui você pode permitir org_admin criar dentro da própria org, etc.

  let createdUserId: string | null = null;
  let createdNow = false;

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
        // se já existe, tratamos como usuário existente
        const looksExisting =
          (error.status ?? 0) === 422 ||
          (error.status ?? 0) === 409 ||
          (error.message ?? "").toLowerCase().includes("already") ||
          (error.message ?? "").toLowerCase().includes("registered");

        if (looksExisting) {
          // tenta localizar pelo profiles.email
          const { data: profileByEmail, error: profErr } = await svc
            .from("profiles")
            .select("id")
            .ilike("email", input.email)
            .maybeSingle();

          if (profErr) {
            console.error(
              "[createUserAsAdmin] Falha ao buscar profile por email:",
              profErr
            );
            return {
              ok: false,
              error:
                "Usuário parece existir, mas não foi possível localizá-lo no profiles.",
              details: profErr,
            };
          }
          if (!profileByEmail?.id) {
            console.warn(
              "[createUserAsAdmin] Usuário já existe no Auth mas não está no profiles."
            );
            return {
              ok: false,
              error:
                "Usuário parece existir, mas não foi encontrado no profiles. Associe manualmente ou ajuste para armazenar o e-mail no profiles.",
            };
          }

          createdUserId = profileByEmail.id;
          createdNow = false;
        } else {
          console.error("[createUserAsAdmin] inviteUserByEmail error:", error);
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
      // input.mode === "create"
      const { data, error } = await svc.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        user_metadata: { name: input.name },
      });
      if (error || !data?.user?.id) {
        console.error("[createUserAsAdmin] createUser error:", error);
        return { ok: false, error: "Erro ao criar usuário", details: error };
      }
      createdUserId = data.user.id;
      createdNow = true;
    }

    if (!createdUserId) {
      console.error("[createUserAsAdmin] Falha ao obter ID do usuário");
      return { ok: false, error: "Falha ao obter ID do usuário" };
    }

    // 2) profiles (upsert)
    const profileRole: AppRole =
      (input.org_role as AppRole) ||
      (input.unit_role as AppRole) ||
      ("unit_user" as AppRole);

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
      console.error(
        "[createUserAsAdmin] upsert profiles error:",
        upsertProfileErr
      );
      throw new Error(`Erro no profiles: ${upsertProfileErr.message}`);
    }

    const { data: checkProfile } = await svc
      .from("profiles")
      .select("id, role")
      .eq("id", createdUserId)
      .single();

    if (checkProfile?.role === "platform_admin") {
      throw new Error(
        "Proteção: o perfil ficou como 'platform_admin', o que é proibido pela aplicação."
      );
    }

    // 3) org_members
    const orgRole: AppRole = (input.org_role as AppRole) ?? "unit_user";
    const { error: orgInsertErr } = await svc.from("org_members").insert({
      org_id: input.org_id,
      user_id: createdUserId,
      role: orgRole,
    });
    if (orgInsertErr) {
      console.error(
        "[createUserAsAdmin] insert org_members error:",
        orgInsertErr
      );
      throw new Error(
        `Erro ao vincular na organização: ${orgInsertErr.message}`
      );
    }

    // 4) unit_members (opcional)
    if (input.unit_id) {
      const unitRole: AppRole = (input.unit_role as AppRole) ?? "unit_user";
      const { error: unitInsertErr } = await svc.from("unit_members").insert({
        unit_id: input.unit_id,
        user_id: createdUserId,
        org_id: input.org_id,
        role: unitRole,
      });
      if (unitInsertErr) {
        console.error(
          "[createUserAsAdmin] insert unit_members error:",
          unitInsertErr
        );
        throw new Error(
          `Erro ao vincular na unidade: ${unitInsertErr.message}`
        );
      }
    }

    return { ok: true, user_id: createdUserId };
  } catch (err: any) {
    // ROLLBACK seguro
    if (createdNow && createdUserId) {
      try {
        const isPlatAdmin = await isPlatformAdminById(createdUserId).then(
          (r) => r ?? false
        );
        if (!isPlatAdmin) {
          await svc.auth.admin.deleteUser(createdUserId);
        } else {
          console.warn(
            `[createUserAsAdmin] Proteção: não deletar platform_admin automaticamente (${createdUserId}).`
          );
        }
      } catch (delErr) {
        console.error(
          "[createUserAsAdmin] Falha ao tentar rollback/delete:",
          delErr
        );
      }
    }

    console.error("[createUserAsAdmin] CATCH error:", err);
    return {
      ok: false,
      error: err?.message ?? "Erro ao criar usuário",
      details: err,
    };
  }
}
