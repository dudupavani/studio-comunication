// src/app/api/learning/courses/[courseId]/progress/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse, canViewCourse } from "@/lib/learning/access";
import { ProgressUpdateSchema } from "@/lib/learning/validations";

const paramsSchema = z.object({ courseId: z.string().uuid() });

export async function GET(
  _: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/progress">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, org_id, unit_id, status")
    .eq("id", parsed.data.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const allowed =
    canViewCourse(auth, course.org_id as string, course.unit_id as string | null) ||
    canManageCourse(auth, course.org_id as string, course.unit_id as string | null);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const [lessonsRes, progressRes] = await Promise.all([
    supabase.from("lessons").select("id").eq("course_id", parsed.data.courseId),
    supabase
      .from("course_progress")
      .select("*")
      .eq("course_id", parsed.data.courseId)
      .eq("user_id", auth.userId),
  ]);

  if (lessonsRes.error) return NextResponse.json({ error: lessonsRes.error.message }, { status: 500 });
  if (progressRes.error) return NextResponse.json({ error: progressRes.error.message }, { status: 500 });

  const lessons = lessonsRes.data ?? [];
  const progress = progressRes.data ?? [];
  const completed = progress.filter((p: any) => p.status === "concluido").length;
  return NextResponse.json({
    data: {
      totalLessons: lessons.length,
      completedLessons: completed,
      progress,
    },
  });
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/progress">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, org_id, unit_id")
    .eq("id", parsedParams.data.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const allowed =
    canViewCourse(auth, course.org_id as string, course.unit_id as string | null) ||
    canManageCourse(auth, course.org_id as string, course.unit_id as string | null);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ProgressUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Confirma que a lesson pertence ao curso
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id")
      .eq("id", parsed.data.lessonId)
      .eq("course_id", parsedParams.data.courseId)
      .maybeSingle();
    if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });

    const payload = {
      user_id: auth.userId,
      course_id: parsedParams.data.courseId,
      lesson_id: parsed.data.lessonId,
      status: parsed.data.status,
      nota_quiz: parsed.data.nota_quiz ?? null,
      data_conclusao:
        parsed.data.status === "concluido" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("course_progress")
      .upsert(payload, { onConflict: "user_id,lesson_id" })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("learning:progress POST error", err);
    return NextResponse.json({ error: err?.message || "Erro ao salvar progresso" }, { status: 500 });
  }
}
