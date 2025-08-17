import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const userId = params.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "missing user id" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 1) Marca como habilitado no profiles
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      disabled: false,
      disabled_at: null,
      // disabled_by: null
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("[enable] profiles update error:", updateErr);
    return NextResponse.json(
      { ok: false, error: updateErr.message },
      { status: 500 }
    );
  }

  // 2) (opcional) reflete no user_metadata
  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { disabled: false },
  });
  if (metaErr) {
    console.warn("[enable] updateUserById meta warning:", metaErr);
  }

  return NextResponse.json({ ok: true });
}
