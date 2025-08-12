// src/app/api/orgs/[orgId]/units/[unitId]/members/route.ts
import { NextResponse } from "next/server";
import { addUnitMember, removeUnitMember } from "@/lib/actions/unit-members";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { orgId: string; unitId: string } }
) {
  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Usuário e papel são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await addUnitMember({
      orgId: params.orgId,
      unitId: params.unitId,
      userId,
      role,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[/api/orgs/.../members] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao adicionar membro" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { orgId: string; unitId: string } }
) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "ID do usuário é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const result = await removeUnitMember({
      orgId: params.orgId,
      unitId: params.unitId,
      userId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[/api/orgs/.../members] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao remover membro" },
      { status: 500 }
    );
  }
}
