import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// import { getAuthContext } from "@/lib/auth-context";
// import { isPlatformAdmin } from "@/lib/actions/admin";

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
