import { NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";

export async function GET() {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const { data: creatorRows, error } = await supabase
      .from("chats")
      .select("created_by")
      .eq("org_id", auth.orgId)
      .not("created_by", "is", null);

    if (error) {
      console.error("MESSAGES creators list error:", error);
      return errorResponse(500, "db_error", "Failed to load creators");
    }

    const creatorIds = Array.from(
      new Set(
        (creatorRows ?? [])
          .map((row: any) => row.created_by as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (!creatorIds.length) {
      return NextResponse.json({ items: [] });
    }

    const svc = createServiceClient();
    const { data: profiles, error: profilesError } = await svc
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", creatorIds);

    if (profilesError) {
      console.warn("MESSAGES creators profiles error:", profilesError);
    }

    const profileNameMap = new Map<string, string | null>();
    const profileAvatarMap = new Map<string, string | null>();
    if (Array.isArray(profiles)) {
      profiles.forEach((row: any) => {
        if (!row?.id) return;
        profileNameMap.set(row.id as string, row.full_name ?? null);
        profileAvatarMap.set(row.id as string, row.avatar_url ?? null);
      });
    }

    const { data: identities, error: identityError } = await svc.rpc(
      "get_user_identity_many",
      { p_user_ids: creatorIds }
    );

    if (identityError) {
      console.warn("MESSAGES creators identity error:", identityError);
    }

    const identityMap = new Map<
      string,
      { full_name: string | null; email: string | null; avatar_url: string | null }
    >();
    if (Array.isArray(identities)) {
      identities.forEach((identity: any) => {
        if (!identity?.user_id) return;
        identityMap.set(identity.user_id, {
          full_name: identity.full_name ?? null,
          email: identity.email ?? null,
          avatar_url: identity.avatar_url ?? null,
        });
      });
    }

    const { data: cargos, error: cargoError } = await svc
      .from("employee_profile")
      .select("user_id, cargo")
      .in("user_id", creatorIds);

    if (cargoError) {
      console.warn("MESSAGES creators cargo error:", cargoError);
    }

    const cargoMap = new Map<string, string | null>();
    if (Array.isArray(cargos)) {
      cargos.forEach((row: any) => {
        if (!row?.user_id) return;
        cargoMap.set(row.user_id as string, row.cargo ?? null);
      });
    }

    const items = creatorIds
      .map((id) => {
        const identity = identityMap.get(id);
        const profileName = profileNameMap.get(id);
        return {
          id,
          full_name:
            profileName ??
            identity?.full_name ??
            identity?.email ??
            null,
          avatar_url: profileAvatarMap.get(id) ?? identity?.avatar_url ?? null,
          cargo: cargoMap.get(id) ?? null,
        };
      })
      .sort((a, b) => {
        const av = (a.full_name || a.id).toLowerCase();
        const bv = (b.full_name || b.id).toLowerCase();
        return av.localeCompare(bv);
      });

    return NextResponse.json({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
