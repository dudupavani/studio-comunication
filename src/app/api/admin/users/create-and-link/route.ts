// src/app/api/admin/users/create-and-link/route.ts
import { NextResponse } from "next/server";
import {
  createUserAsAdmin,
  CreateUserAsAdminSchema,
} from "@/lib/actions/create-user-as-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // valida com o mesmo schema da action (garante consistência)
    const parsed = CreateUserAsAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Payload inválido",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await createUserAsAdmin(parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, details: result.details },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: true, user_id: result.user_id },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}
