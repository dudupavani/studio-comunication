import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";
import { createClient } from "@/lib/supabase/server";
import { LessonUpdateSchema } from "@/lib/learning/validations";

const paramsSchema = z.object({ lessonId: z.string().uuid() });

async function resolveParams(
  params: { lessonId: string } | Promise<{ lessonId: string }>
) {
  const resolved = await Promise.resolve(params);
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) throw new Error("Aula inválida");
  return parsed.data.lessonId;
}

export async function PATCH(
  request: Request,
  { params }: { params: { lessonId: string } | Promise<{ lessonId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let lessonId: string;
  try {
    lessonId = await resolveParams(params);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Aula inválida" }, { status: 400 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = LessonUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createClient();
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("id, course:courses!lessons_course_id_fkey(id, org_id, unit_id)")
      .eq("id", lessonId)
      .maybeSingle();

    if (error) throw error;
    if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });

    if (
      !canManageCourse(
        auth,
        lesson.course?.org_id as string,
        lesson.course?.unit_id as string | null
      )
    ) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const updatePayload = {
      title: parsed.data.title ?? undefined,
      description: parsed.data.description ?? undefined,
      content_html: parsed.data.content_html ?? undefined,
      video_url: parsed.data.video_url ?? undefined,
      liberada: typeof parsed.data.liberada === "boolean" ? parsed.data.liberada : undefined,
      module_id: parsed.data.module_id ?? undefined,
      ordem: parsed.data.ordem ?? undefined,
    };

    const { data, error: updateError } = await supabase
      .from("lessons")
      .update(updatePayload)
      .eq("id", lessonId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("lesson PATCH error", err);
    return NextResponse.json({ error: err?.message || "Erro ao atualizar aula" }, { status: 500 });
  }
}
