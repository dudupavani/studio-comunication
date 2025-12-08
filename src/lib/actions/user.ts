"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "../types";
import type { PlatformRole, OrgRole, UnitRole } from "@/lib/types/roles";
import { PLATFORM_ADMIN } from "@/lib/types/roles";
import { safeDeleteUser } from "@/lib/auth/safe-delete";
import type { TablesInsert } from "@/lib/supabase/types";
import { adminAddMember } from "@/lib/admin/org-members";

/** Admin client (service_role) – usar só em Server Actions / Route Handlers */
async function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE");
  return createAdminClient(url, serviceKey);
}

/** Helpers mínimos para este passo */
async function getSessionUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user?.id ?? null;
}

/** platform_admin vem de profiles.global_role */
async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return false;

  const { data } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", uid)
    .maybeSingle();

  return data?.global_role === PLATFORM_ADMIN;
}

/** Retorna { org_id, role } do usuário logado em org_members (modelo 1 usuário -> 1 org) */
async function getMyOrgMembership(): Promise<{
  org_id: string;
  role: OrgRole | UnitRole;
} | null> {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return null;

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", uid)
    .maybeSingle();

  return data ? { org_id: data.org_id, role: data.role as OrgRole } : null;
}

/** Garante que quem está executando é platform_admin OU org_admin da org alvo */
async function assertCanManageOrg(targetOrgId: string) {
  const [platform, me] = await Promise.all([
    isPlatformAdmin(),
    getMyOrgMembership(),
  ]);
  if (platform) return;

  if (!me || me.org_id !== targetOrgId || me.role !== "org_admin") {
    throw new Error("Acesso negado: você não pode gerenciar esta organização.");
  }
}

/* ===================== SELF SERVICE (usuário edita o próprio perfil) ===================== */
export async function updateUserProfile(formData: FormData) {
  const supabase = createClient();

  const rawName = formData.get("name");
  const name =
    typeof rawName === "string" ? rawName.trim() : (rawName as string | null);
  const phone = (formData.get("phone") as string) ?? null;
  const avatarInput = formData.get("avatar");

  // sessão
  const {
    data: { user },
    error: authGetErr,
  } = await supabase.auth.getUser();
  if (!user || authGetErr) {
    return { error: "You must be logged in to update your profile." };
  }

  // 1) Upload/remoção do avatar -> definir avatar_url (null = remover; undefined = manter)
  let avatar_url: string | null | undefined = undefined;

  if (
    avatarInput &&
    avatarInput !== "REMOVE" &&
    typeof avatarInput !== "string"
  ) {
    const file = avatarInput as File;
    if (file.size > 0) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${user.id}/avatar.jpg`, file, { upsert: true });

      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const baseUrl = publicUrlData.publicUrl;
      avatar_url = baseUrl ? `${baseUrl}?t=${Date.now()}` : baseUrl;
    }
  } else if (avatarInput === "REMOVE") {
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
    avatar_url = null; // sinaliza remoção
  }

  // 2) Atualizar dados no Auth (nome/avatar)
  const authPayload: {
    data: { name?: string; avatar_url?: string | null };
  } = { data: {} };

  if (name && typeof name === "string" && name.length > 0) {
    authPayload.data.name = name;
  }
  if (typeof avatar_url !== "undefined")
    authPayload.data.avatar_url = avatar_url;

  if (Object.keys(authPayload.data).length) {
    const { error: authUpdateErr } = await supabase.auth.updateUser(
      authPayload
    );
    if (authUpdateErr) {
      return { error: authUpdateErr.message };
    }
  }

  // 3) Atualizar PROFILE diretamente (somente campos permitidos)
  const profilePayload: TablesInsert<"profiles"> = { id: user.id };
  let hasProfileUpdates = false;
  if (typeof name === "string" && name.length > 0) {
    profilePayload.full_name = name;
    hasProfileUpdates = true;
  }
  if (typeof phone !== "undefined") {
    profilePayload.phone = phone || null;
    hasProfileUpdates = true;
  }
  if (typeof avatar_url !== "undefined") {
    profilePayload.avatar_url = avatar_url;
    hasProfileUpdates = true;
  }

  if (hasProfileUpdates) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileErr) {
      // Fallback: em ambientes onde a policy de insert não está ativa, tenta via service role
      const isRls =
        profileErr.code === "42501" ||
        /row-level security/i.test(profileErr.message ?? "") ||
        /violates row-level security/i.test(profileErr.message ?? "");

      if (isRls) {
        const svc = createServiceClient();
        const { error: svcErr } = await svc
          .from("profiles")
          .upsert(profilePayload, { onConflict: "id" });

        if (!svcErr) {
          // sucesso via service role
        } else {
          return { error: svcErr.message };
        }
      } else {
        return { error: profileErr.message };
      }
    }
  }

  // 4) Revalidate
  revalidatePath("/profile");
  return { error: null };
}

/* ===================== ADMIN: LIST/GET ===================== */

export async function getUsers(
  orgId?: string,
  opts?: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    orderDir?: "asc" | "desc";
  }
): Promise<
  (Profile & {
    org_role?: string;
    unit_roles?: string[];
    unit_names?: string[];
    disabled?: boolean;
  })[]
> {
  console.time("getUsers");

  // Default options
  const options = {
    page: opts?.page || 1,
    pageSize: opts?.pageSize || 20,
    orderBy: opts?.orderBy || "full_name",
    orderDir: opts?.orderDir || "asc",
  };

  const supabaseAdmin = await getAdminClient();

  // 1) org_members - buscar user_id e role (pode ser filtrado pela org)
  let orgMems: { user_id: string; role: string }[] | null = null;
  let orgMemsError: any = null;

  if (orgId) {
    const { data, error } = await supabaseAdmin
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", orgId);

    orgMems = data || null;
    orgMemsError = error;
  } else {
    const { data, error } = await supabaseAdmin
      .from("org_members")
      .select("user_id, role");

    orgMems = data || null;
    orgMemsError = error;
  }

  console.debug("getUsers — org_members count:", orgMems?.length ?? 0);

  if (orgMemsError) {
    console.error("Erro buscando org_members:", orgMemsError);
    console.timeEnd("getUsers");
    return [];
  }

  const allUserIds = orgMems ? orgMems.map((m) => m.user_id) : [];

  // Se temos orgId mas não temos membros, retornar array vazio
  if (orgId && allUserIds.length === 0) {
    console.debug("getUsers — profiles count:", 0);
    console.timeEnd("getUsers");
    return [];
  }

  // 2) profiles — paginar aqui e só aqui
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;

  let profilesQuery = supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, avatar_url, phone, global_role, created_at, disabled, disabled_at"
    )
    .order(options.orderBy, { ascending: options.orderDir === "asc" })
    .range(from, to);

  if (allUserIds.length > 0) {
    profilesQuery = profilesQuery.in("id", allUserIds);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;

  console.debug("getUsers — profiles count:", profiles?.length ?? 0);

  if (profilesError) {
    console.error("Erro buscando profiles:", profilesError);
    console.timeEnd("getUsers");
    return [];
  }

  const pageUserIds = Array.isArray(profiles)
    ? profiles.map((p: any) => p.id)
    : [];

  // 2.1) Buscar e-mails no Auth APENAS para os users da página
  const emailMap = new Map<string, string>();
  if (pageUserIds.length > 0) {
    const emailResults = await Promise.all(
      pageUserIds.map(async (id) => {
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(
            id
          );
          if (error || !data?.user) {
            return { id, email: "" };
          }
          return { id, email: data.user.email ?? "" };
        } catch {
          return { id, email: "" };
        }
      })
    );
    emailResults.forEach(({ id, email }) => emailMap.set(id, email));
  }

  // 3) unit_members + nomes das unidades (somente usuários da página)
  let unitMembersData: any[] = [];
  let unitMembersErr: any = null;

  if (pageUserIds.length > 0) {
    const unitMembersResult = await supabaseAdmin
      .from("unit_members")
      .select("user_id, unit_id")
      .in("user_id", pageUserIds);

    unitMembersErr = unitMembersResult.error;

    if (!unitMembersErr && unitMembersResult.data) {
      unitMembersData = unitMembersResult.data;

      const unitIds = [
        ...new Set(unitMembersData.map((um: any) => um.unit_id)),
      ];
      if (unitIds.length > 0) {
        const unitsResult = await supabaseAdmin
          .from("units")
          .select("id, name")
          .in("id", unitIds);

        if (!unitsResult.error && unitsResult.data) {
          const unitNameMap = new Map(
            unitsResult.data.map((unit: any) => [unit.id, unit.name])
          );
          unitMembersData = unitMembersData.map((um: any) => ({
            ...um,
            units: { name: unitNameMap.get(um.unit_id) || null },
          }));
        }
      }
    }
  }

  if (unitMembersErr) {
    console.error("Erro buscando unit_members:", unitMembersErr);
  }

  // 4) equipes (time principal)
  let teamMembersData: any[] = [];
  let teamMembersErr: any = null;
  if (pageUserIds.length > 0) {
    const teamMembersQuery = supabaseAdmin
      .from("equipe_members")
      .select(
        `
        user_id,
        equipe_id,
        equipes!inner (
          id,
          name
        )
      `
      )
      .in("user_id", pageUserIds);

    const teamMembersResult = orgId
      ? await teamMembersQuery.eq("org_id", orgId)
      : await teamMembersQuery;

    teamMembersErr = teamMembersResult.error;
    if (!teamMembersErr && teamMembersResult.data) {
      teamMembersData = teamMembersResult.data;
    }
  }

  if (teamMembersErr) {
    console.error("Erro buscando equipe_members:", teamMembersErr);
  }

  // 5) employee_profile (cargo, data de entrada)
  const employeeProfileMap = new Map<
    string,
    { cargo: string | null; dataEntrada: string | null }
  >();
  if (pageUserIds.length > 0) {
    const { data: employeeProfiles, error: employeeProfilesErr } =
      await supabaseAdmin
        .from("employee_profile")
        .select("user_id, cargo, data_entrada")
        .in("user_id", pageUserIds);

    if (employeeProfilesErr) {
      console.error("Erro buscando employee_profile:", employeeProfilesErr);
    } else if (employeeProfiles) {
      employeeProfiles.forEach((row: any) => {
        employeeProfileMap.set(row.user_id as string, {
          cargo: row.cargo ?? null,
          dataEntrada: row.data_entrada ?? null,
        });
      });
    }
  }

  const safeProfiles: any[] = Array.isArray(profiles) ? profiles : [];
  const orgRoleMap = new Map<string, string>();
  if (Array.isArray(orgMems)) {
    orgMems.forEach((orgMember) => {
      orgRoleMap.set(orgMember.user_id, orgMember.role);
    });
  }

  const unitRolesMap = new Map<string, string[]>();
  const unitNamesMap = new Map<string, string[]>();
  if (Array.isArray(unitMembersData)) {
    unitMembersData.forEach((unitMember) => {
      if (!unitRolesMap.has(unitMember.user_id)) {
        unitRolesMap.set(unitMember.user_id, []);
        unitNamesMap.set(unitMember.user_id, []);
      }
      // Papel efetivo vem de org_members.role; usamos "unit_user" como rótulo da vinculação
      unitRolesMap.get(unitMember.user_id)?.push("unit_user");
      if (unitMember.units?.name) {
        unitNamesMap.get(unitMember.user_id)?.push(unitMember.units.name);
      }
    });
  }

  const teamNamesMap = new Map<string, string[]>();
  if (Array.isArray(teamMembersData)) {
    teamMembersData.forEach((teamMember) => {
      const userId = teamMember.user_id as string;
      if (!teamNamesMap.has(userId)) {
        teamNamesMap.set(userId, []);
      }
      const teamName = teamMember.equipes?.name ?? null;
      if (teamName) {
        teamNamesMap.get(userId)?.push(teamName);
      }
    });
  }

  // ✅ Monta o resultado SOMENTE com os perfis da página
  const result = safeProfiles.map((p: any) => {
    const userId = p.id as string;
    const orgRole = orgRoleMap.get(userId);
    const unitRoles = unitRolesMap.get(userId) || [];
    const unitNames = unitNamesMap.get(userId) || [];
    const email = emailMap.get(userId) ?? "";

    return {
      id: userId,
      email,
      full_name: p.full_name ?? "No name",
      global_role: p.global_role,
      org_role: orgRole,
      unit_roles: unitRoles,
      unit_names: unitNames,
      team_names: teamNamesMap.get(userId) ?? [],
      employee_cargo: employeeProfileMap.get(userId)?.cargo ?? null,
      employee_entry_date: employeeProfileMap.get(userId)?.dataEntrada ?? null,
      created_at: p.created_at ?? new Date().toISOString(),
      phone: p.phone ?? null,
      avatar_url: p.avatar_url ?? null,
      disabled: Boolean(p.disabled ?? false),
    };
  });

  console.timeEnd("getUsers");
  return result;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabaseAdmin = await getAdminClient();

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, global_role, created_at, phone, avatar_url, disabled"
    );

  if (error || !profiles) return [];

  const emailMap = new Map<string, string>();
  await Promise.all(
    profiles.map(async (p: any) => {
      try {
        const { data, error: e } = await supabaseAdmin.auth.admin.getUserById(
          p.id
        );
        if (!e && data?.user) {
          emailMap.set(p.id, data.user.email ?? "");
        } else {
          emailMap.set(p.id, "");
        }
      } catch {
        emailMap.set(p.id, "");
      }
    })
  );

  return profiles.map((p: any) => ({
    id: p.id,
    email: emailMap.get(p.id) ?? "",
    full_name: p.full_name ?? "No name",
    global_role: p.global_role,
    created_at: p.created_at,
    phone: p.phone ?? null,
    avatar_url: p.avatar_url ?? null,
    disabled: Boolean(p.disabled ?? false),
  }));
}

export async function getUserById(id: string): Promise<Profile | null> {
  const supabaseAdmin = await getAdminClient();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, global_role, created_at, phone, avatar_url, disabled"
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    full_name:
      profile?.full_name ?? (user.user_metadata as any)?.name ?? "No name",
    global_role: profile?.global_role ?? null,
    created_at: profile?.created_at ?? user.created_at,
    phone: profile?.phone ?? null,
    avatar_url: profile?.avatar_url ?? null,
    disabled: Boolean(profile?.disabled ?? false),
  } as Profile & { disabled?: boolean };
}

/* ===================== ADMIN: UPDATE ===================== */
export async function updateUser(formData: FormData) {
  const supabaseAdmin = await getAdminClient();

  const id = formData.get("id") as string;
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!id) return { error: "ID do usuário é obrigatório." };
  if (!name) return { error: "Nome é obrigatório." };

  // 1) NUNCA permitir operações envolvendo platform_admin
  const { data: target, error: getErr } = await supabaseAdmin
    .from("profiles")
    .select("id, global_role")
    .eq("id", id)
    .single();

  if (getErr || !target) return { error: "Usuário não encontrado." };

  if (target.global_role === PLATFORM_ADMIN) {
    return {
      error:
        "Usuários com global_role=platform_admin não podem ser editados por esta interface.",
    };
  }

  // 2) Atualiza metadados (nome) no Auth
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name },
  });
  if (error) return { error: error.message };

  // 3) Atualiza apenas campos permitidos no profile
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: name })
    .eq("id", id);

  if (profErr) return { error: profErr.message };

  revalidatePath("/users");
  revalidatePath(`/users/${id}/edit`);
  return { error: null };
}

/* ===================== ADMIN: DELETE ===================== */
export async function deleteUser(userId: string) {
  const supabaseAdmin = await getAdminClient();

  // Proteção: NUNCA deletar platform_admin
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("global_role")
    .eq("id", userId)
    .maybeSingle();

  if (target?.global_role === PLATFORM_ADMIN) {
    return {
      error:
        "Usuários com global_role=platform_admin não podem ser deletados automaticamente.",
    };
  }

  const del = await safeDeleteUser(userId);
  if (!del.ok) return { error: del.error };

  revalidatePath("/users");
  return { error: null };
}

/* ===================== ADMIN: UPDATE ROLES ===================== */
type UpdateUserRolesInput = {
  userId: string;
  orgId: string;
  targetRole: "org_admin" | "org_master" | "unit_master" | "unit_user";
  unitId?: string | null; // null => Matriz (sem unidade)
  teamId?: string | null; // null => sem equipe
};

export async function updateUserRoles(input: UpdateUserRolesInput) {
  const {
    userId,
    orgId,
    targetRole,
    unitId,
    teamId,
  } = input;
  const supabase = await createClient(); // RLS para validar sessão/permissões
  const supabaseAdmin = createServiceClient(); // service role para evitar recursion em policies
  const needsUnitRole =
    targetRole === "unit_master" || targetRole === "unit_user";
  const membershipUnitId = unitId ?? null;
  const membershipTeamId = teamId ?? null;
  // validações de integridade cruzada
  if (membershipUnitId) {
    const { data: unitRow, error: unitErr } = await supabaseAdmin
      .from("units")
      .select("id, org_id")
      .eq("id", membershipUnitId)
      .maybeSingle();
    if (unitErr) return { ok: false, error: unitErr.message };
    if (!unitRow || unitRow.org_id !== orgId) {
      return { ok: false, error: "Unidade não pertence à organização." };
    }
  }
  if (membershipTeamId) {
    const { data: teamRow, error: teamErr } = await supabaseAdmin
      .from("equipes")
      .select("id, org_id")
      .eq("id", membershipTeamId)
      .maybeSingle();
    if (teamErr) return { ok: false, error: teamErr.message };
    if (!teamRow || teamRow.org_id !== orgId) {
      return { ok: false, error: "Equipe não pertence à organização." };
    }
  }

  // Verifica quem está executando
  const {
    data: { user },
    error: sessionErr,
  } = await supabase.auth.getUser();
  if (sessionErr || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Confere se é org_admin na mesma org ou platform_admin
  const { data: canDo, error: permErr } = await supabase.rpc(
    "is_platform_admin"
  );
  if (permErr) return { ok: false, error: permErr.message };

  const isPlat = Boolean(canDo);

  if (!isPlat) {
    const { data: meOrgRole, error: orgCheckErr } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgCheckErr) return { ok: false, error: orgCheckErr.message };
    const role = meOrgRole?.role as OrgRole | UnitRole | null;
    const allowed =
      role === "org_admin" || role === "org_master" || role === "unit_master";
    if (!allowed) return { ok: false, error: "Forbidden" };
  }

  // Garante que o usuário de destino tem o vínculo org_members (necessário para unit_members FK)
  const { data: membership, error: omErr } = await supabase
    .from("org_members")
    .select("org_id, user_id, role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (omErr) return { ok: false, error: omErr.message };

  if (!membership) {
    const { error: insertOmErr } = await adminAddMember(orgId, userId, targetRole);
    if (insertOmErr) return { ok: false, error: insertOmErr.message };
  } else {
    const { error: upOmErr } = await adminUpdateMemberRole(orgId, userId, targetRole);
    if (upOmErr) return { ok: false, error: upOmErr.message };
  }

  // ===== vínculo de unidade para colaboradores (independente do role)
  // Estratégia: zera vínculos da org e cria o vínculo único selecionado (ou nenhum = Matriz)
  const { error: delUnitsErr } = await supabaseAdmin
    .from("unit_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (delUnitsErr) return { ok: false, error: delUnitsErr.message };

  if (membershipUnitId) {
    const { error: upMembershipErr } = await supabaseAdmin
      .from("unit_members")
      .upsert(
        {
          unit_id: membershipUnitId,
          user_id: userId,
          org_id: orgId,
        },
        { onConflict: "unit_id,user_id" }
      );
    if (upMembershipErr) return { ok: false, error: upMembershipErr.message };
  }

  // ===== vínculo de equipe
  // Estratégia: vínculo único por usuário na org
  const { error: delTeamsErr } = await supabaseAdmin
    .from("equipe_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (delTeamsErr) return { ok: false, error: delTeamsErr.message };

  if (membershipTeamId) {
    const { error: upTeamErr } = await supabaseAdmin
      .from("equipe_members")
      .upsert(
        {
          equipe_id: membershipTeamId,
          user_id: userId,
          org_id: orgId,
        },
        { onConflict: "equipe_id,user_id" }
      );
    if (upTeamErr) return { ok: false, error: upTeamErr.message };
  }

  // Sincroniza equipe principal no employee_profile (quando existir)
  if (membershipTeamId) {
    await supabaseAdmin
      .from("employee_profile")
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          time_principal_id: membershipTeamId,
        },
        { onConflict: "org_id,user_id" }
      );
  } else {
    // Se removido, zera o campo
    await supabaseAdmin
      .from("employee_profile")
      .update({ time_principal_id: null })
      .eq("org_id", orgId)
      .eq("user_id", userId);
  }

  revalidatePath("/users");
  revalidatePath(`/users/${userId}/edit`);
  return { ok: true };
}

/* ===================== GET USER ROLES ===================== */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

type UserRoles = {
  role: (OrgRole | UnitRole) | null;
  unitId: string | null; // se null => Matriz
  teamId: string | null;
};

export async function getUserRoles(
  userId: string,
  orgId: string
): Promise<Result<UserRoles>> {
  const supabase = createServiceClient();

  // Get org role
  const { data: orgMembership, error: orgErr } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orgErr) return { ok: false, error: orgErr.message };

  // Get unit memberships (sem role)
  const { data: unitMemberships, error: unitErr } = await supabase
    .from("unit_members")
    .select("unit_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .limit(1);

  if (unitErr) return { ok: false, error: unitErr.message };

  // Get team memberships (único por usuário na org)
  const { data: teamMemberships, error: teamErr } = await supabase
    .from("equipe_members")
    .select("equipe_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .limit(1);

  if (teamErr) return { ok: false, error: teamErr.message };

  const unitId = unitMemberships && unitMemberships[0]?.unit_id
    ? (unitMemberships[0].unit_id as string)
    : null;
  const teamId = teamMemberships && teamMemberships[0]?.equipe_id
    ? (teamMemberships[0].equipe_id as string)
    : null;

  return {
    ok: true,
    data: {
      role: (orgMembership?.role as OrgRole | UnitRole | null) ?? null,
      unitId,
      teamId,
    },
  };
}

/* ===================== ADMIN: CREATE ===================== */
// Função createUserAsAdmin removida. Use apenas o fluxo de convite por Magic Link.
