// src/app/api/learning/courses/[courseId]/reviews/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse, canViewCourse } from "@/lib/learning/access";
import { ReviewCreateSchema } from "@/lib/learning/validations";

const paramsSchema = z.object({ courseId: z.string().uuid() });

export async function GET(
  _: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/reviews">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, org_id, unit_id")
    .eq("id", parsed.data.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const allowed =
    canViewCourse(auth, course.org_id as string, course.unit_id as string | null) ||
    canManageCourse(auth, course.org_id as string, course.unit_id as string | null);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data, error } = await supabase
    .from("course_reviews")
    .select("*")
    .eq("course_id", parsed.data.courseId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/reviews">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, org_id, unit_id, status")
    .eq("id", parsedParams.data.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const canView =
    canViewCourse(auth, course.org_id as string, course.unit_id as string | null) ||
    canManageCourse(auth, course.org_id as string, course.unit_id as string | null);
  if (!canView || course.status !== "published") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = ReviewCreateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
    }

    // Verifica conclusão do curso (todas aulas concluídas)
    const [lessonsRes, progressRes, examRes] = await Promise.all([
      supabase.from("lessons").select("id").eq("course_id", parsedParams.data.courseId),
      supabase
        .from("course_progress")
        .select("lesson_id, status, nota_prova_final")
        .eq("course_id", parsedParams.data.courseId)
        .eq("user_id", auth.userId),
      supabase.from("exams").select("id, nota_minima_aprovacao").eq("course_id", parsedParams.data.courseId).maybeSingle(),
    ]);

    if (lessonsRes.error) throw lessonsRes.error;
    if (progressRes.error) throw progressRes.error;
    if (examRes.error) throw examRes.error;

    const lessons = lessonsRes.data ?? [];
    const progress = progressRes.data ?? [];
    const allConcluded = lessons.every((lesson: any) =>
      progress.some((p: any) => p.lesson_id === lesson.id && p.status === "concluido")
    );
    if (!allConcluded) {
      return NextResponse.json({ error: "Finalize todas as aulas antes de avaliar" }, { status: 400 });
    }

    const exam = examRes.data;
    if (exam?.id) {
      const passed = progress.some(
        (p: any) =>
          p.nota_prova_final !== null &&
          Number(p.nota_prova_final) >= Number(exam.nota_minima_aprovacao)
      );
      if (!passed) {
        return NextResponse.json({ error: "Prova final não aprovada" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("course_reviews")
      .insert({
        course_id: parsedParams.data.courseId,
        user_id: auth.userId,
        rating: parsedBody.data.rating,
        comment: parsedBody.data.comment ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;

    // Atualiza agregados
    const { data: ratings, error: ratingsErr } = await supabase
      .from("course_reviews")
      .select("rating")
      .eq("course_id", parsedParams.data.courseId);
    if (!ratingsErr && ratings) {
      const count = ratings.length;
      const sum = ratings.reduce((acc: number, r: any) => acc + Number(r.rating || 0), 0);
      const avg = count ? sum / count : 0;
      await supabase
        .from("courses")
        .update({ avaliacao_media: avg, quantidade_avaliacoes: count })
        .eq("id", parsedParams.data.courseId);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("learning:reviews POST error", err);
    return NextResponse.json({ error: err?.message || "Erro ao enviar avaliação" }, { status: 500 });
  }
}
