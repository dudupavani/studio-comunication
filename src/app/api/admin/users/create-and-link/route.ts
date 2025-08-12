// src/app/api/admin/users/create-and-link/route.ts
import { NextResponse } from "next/server";
import { createUserAsAdmin } from "@/lib/actions/user";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.name || !body?.email || !body?.org_id) {
      return NextResponse.json(
        {
          error: "Nome, e-mail e organização são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const result = await createUserAsAdmin({
      email: body.email,
      full_name: body.name,
      orgId: body.org_id,
      orgRole: body.org_role || "unit_user",
      password: undefined, // será gerado automaticamente
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: result.id,
        status: result.status,
      },
    });
  } catch (error: any) {
    console.error("[/api/admin/users/create-and-link] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}
