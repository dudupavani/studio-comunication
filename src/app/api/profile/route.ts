// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/actions/user";
import { toLoggableError } from "@/lib/log";

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const result = await updateUserProfile(formData);
    if (result?.error) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar perfil.", details: toLoggableError(error) },
      { status: 500 }
    );
  }
}
