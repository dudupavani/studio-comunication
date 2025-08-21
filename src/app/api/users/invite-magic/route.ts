// src/app/api/users/invite-magic/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth || !canManageUsers(auth)) {
    return NextResponse.json(
      { ok: false, error: "Acesso negado: apenas platform_admin ou org_admin." },
      { status: 403 }
    );
  }

  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid email" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:9002";

  // Client server-side com Service Role (sem cookies)
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const redirect = new URL("/auth/magic", appUrl);

  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}