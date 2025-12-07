// src/app/api/learning/courses/[courseId]/exam/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse, canViewCourse } from "@/lib/learning/access";
import { ExamUpsertSchema } from "@/lib/learning/validations";

const paramsSchema = z.object({ courseId: z.string().uuid() });

export async function GET(
  _: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/exam">
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
  if (!allowed || (course.status !== "published" && !canManageCourse(auth, course.org_id, course.unit_id))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: exam, error } = await supabase
    .from("exams")
    .select("*")
    .eq("course_id", parsed.data.courseId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!exam) return NextResponse.json({ data: null });

  const { data: questions, error: qErr } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", exam.id)
    .order("ordem", { ascending: true });
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({ data: { ...exam, questions } });
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/exam">
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
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ExamUpsertSchema.safeParse({ ...body, courseId: parsedParams.data.courseId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await supabase
      .from("exams")
      .select("id")
      .eq("course_id", parsed.data.courseId)
      .maybeSingle();

    let examId = existing.data?.id as string | undefined;
    if (!examId) {
      const { data: inserted, error } = await supabase
        .from("exams")
        .insert({
          course_id: parsed.data.courseId,
          nota_minima_aprovacao: parsed.data.nota_minima_aprovacao,
        })
        .select("id")
        .single();
      if (error) throw error;
      examId = inserted.id as string;
    } else {
      const { error } = await supabase
        .from("exams")
        .update({ nota_minima_aprovacao: parsed.data.nota_minima_aprovacao })
        .eq("id", examId);
      if (error) throw error;
    }

    // Replace questions
    const { error: delErr } = await supabase.from("exam_questions").delete().eq("exam_id", examId);
    if (delErr) throw delErr;

    if (!examId) {
      throw new Error("Não foi possível determinar o ID da prova.");
    }
    const ensuredExamId = examId;
    const toInsert = parsed.data.questions.map((q, idx) => ({
      exam_id: ensuredExamId,
      question: q.question,
      alternatives: q.alternatives,
      correct_index: q.correct_index,
      ordem: q.ordem || idx + 1,
    }));
    const { error: insErr } = await supabase
      .from("exam_questions")
      .insert(toInsert);
    if (insErr) throw insErr;

    return NextResponse.json({ data: { id: examId } });
  } catch (err: any) {
    console.error("learning:exam PUT error", err);
    return NextResponse.json({ error: err?.message || "Erro ao salvar prova" }, { status: 500 });
  }
}
