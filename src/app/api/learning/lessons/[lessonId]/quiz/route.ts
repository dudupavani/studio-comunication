// src/app/api/learning/lessons/[lessonId]/quiz/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse, canViewCourse } from "@/lib/learning/access";
import { LessonQuizUpsertSchema } from "@/lib/learning/validations";

const paramsSchema = z.object({ lessonId: z.string().uuid() });

async function resolveLessonWithCourse(supabase: ReturnType<typeof createClient>, lessonId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id, course_id, courses(org_id, unit_id, status)")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function GET(
  _: Request,
  context: RouteContext<"/api/learning/lessons/[lessonId]/quiz">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Aula inválida" }, { status: 400 });

  const supabase = createClient();
  try {
    const lesson = await resolveLessonWithCourse(supabase, parsed.data.lessonId);
    if (!lesson) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const course = lesson.courses;
    const allowed =
      canViewCourse(auth, course.org_id as string, course.unit_id as string | null) ||
      canManageCourse(auth, course.org_id as string, course.unit_id as string | null);
    if (!allowed || (course.status !== "published" && !canManageCourse(auth, course.org_id, course.unit_id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("lesson_quizzes")
      .select("*")
      .eq("lesson_id", parsed.data.lessonId)
      .order("ordem", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("learning:quiz GET error", err);
    return NextResponse.json({ error: err?.message || "Erro ao carregar quiz" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/learning/lessons/[lessonId]/quiz">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return NextResponse.json({ error: "Aula inválida" }, { status: 400 });

  const supabase = createClient();
  try {
    const lesson = await resolveLessonWithCourse(supabase, parsedParams.data.lessonId);
    if (!lesson) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const course = lesson.courses;
    if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = LessonQuizUpsertSchema.safeParse({ ...body, lessonId: parsedParams.data.lessonId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // substitui quizzes da aula
    const quizzes = parsed.data.quizzes.map((q, idx) => ({
      id: q.id,
      lesson_id: parsed.data.lessonId,
      question: q.question,
      alternatives: q.alternatives,
      correct_index: q.correct_index,
      ordem: q.ordem || idx + 1,
    }));

    const { error: delErr } = await supabase
      .from("lesson_quizzes")
      .delete()
      .eq("lesson_id", parsed.data.lessonId);
    if (delErr) throw delErr;

    if (quizzes.length) {
      const { error: insErr } = await supabase.from("lesson_quizzes").insert(quizzes);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ data: true });
  } catch (err: any) {
    console.error("learning:quiz PUT error", err);
    return NextResponse.json({ error: err?.message || "Erro ao salvar quiz" }, { status: 500 });
  }
}
