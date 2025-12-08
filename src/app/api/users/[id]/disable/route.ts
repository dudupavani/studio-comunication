import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { PLATFORM_ADMIN } from "@/lib/types/roles";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: RouteContext<"/api/users/[id]/disable">
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "Acesso negado: usuário não autenticado." },
      { status: 401 }
    );
  }

  const { id: userId } = await context.params;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "missing user id" },
      { status: 400 }
    );
  }

  // Verificar se o usuário autenticado é platform_admin ou org_admin da mesma organização
  if (auth.platformRole !== PLATFORM_ADMIN) {
    // Se não for platform_admin, verificar se é org_admin da mesma organização
    if (!auth.orgId || auth.orgRole !== "org_admin") {
      return NextResponse.json(
        { ok: false, error: "Acesso negado: apenas platform_admin ou org_admin pode desativar usuários." },
        { status: 403 }
      );
    }

    // Validar que o userId pertence à mesma organização
    const svc = createServiceClient();
    const { data: membership, error: memberErr } = await svc
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .eq("org_id", auth.orgId)
      .single();

    if (memberErr || !membership) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado - usuário não pertence à organização." },
        { status: 403 }
      );
    }
  }

  const svc = createServiceClient();

  const { data: prof } = await svc
    .from("profiles")
    .select("global_role")
    .eq("id", userId)
    .maybeSingle();

  if (prof?.global_role === PLATFORM_ADMIN) {
    return NextResponse.json(
      { ok: false, error: "Não é permitido alterar status de platform_admin." },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      disabled: true,
      disabled_at: new Date().toISOString(),
      // disabled_by: auth?.userId ?? null
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("[disable] profiles update error:", updateErr);
    return NextResponse.json(
      { ok: false, error: updateErr.message },
      { status: 500 }
    );
  }

  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { disabled: true },
  });
  if (metaErr) {
    console.warn("[disable] updateUserById meta warning:", metaErr);
  }

  return NextResponse.json({ ok: true });
}
