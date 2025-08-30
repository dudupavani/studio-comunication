"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClientWithCookies } from "@/lib/supabase/server"; // 👈 usa o client com cookies

const HEX = /^#[0-9A-Fa-f]{6}$/;

const CreateGroupSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().nullable().optional(),
  color: z.string().regex(HEX, "Cor deve estar no formato #RRGGBB"),
});

export async function createGroupAction(input: unknown) {
  const parsed = CreateGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos." };
  }

  const { orgId, name, description = null, color } = parsed.data;

  // ⚠️ IMPORTANTE: este client herda os cookies da request, então auth.uid() ≠ null
  const supabase = createServerClientWithCookies();

  // (opcional) debug rápido — remover depois
  // const { data: me } = await supabase.auth.getUser();
  // console.log("createGroupAction uid:", me?.user?.id);

  const { error } = await supabase
    .from("user_groups")
    .insert([{ org_id: orgId, name, description, color }]);

  if (error) {
    return {
      ok: false as const,
      error: error.message ?? "Falha ao criar grupo.",
    };
  }

  revalidatePath("/groups");
  return { ok: true as const };
}
