// src/app/api/identity/resolve/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const Body = z.object({
  userIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userIds } = Body.parse(body);

    // Service client para ler identidades sem bloqueio de RLS (somente leitura)
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("get_user_identity_many", {
      p_user_ids: userIds,
    });

    if (error) throw error;

    const byId: Record<
      string,
      {
        user_id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        org_id: string;
      }
    > = {};

    for (const row of data ?? []) {
      byId[row.user_id] = {
        user_id: row.user_id,
        full_name: row.full_name ?? null,
        email: row.email ?? null,
        avatar_url: row.avatar_url ?? null,
        org_id: row.org_id,
      };
    }

    // Cache leve (privado) para aliviar refresh rápido de página
    return NextResponse.json(
      { byId },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: toLoggableError(err) }, { status: 400 });
  }
}
