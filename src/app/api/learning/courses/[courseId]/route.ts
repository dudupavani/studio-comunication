// src/app/api/learning/courses/[courseId]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";
import { getCourseWithLessons } from "@/lib/learning/queries";
import { CourseUpdateSchema } from "@/lib/learning/validations";

const paramsSchema = z.object({ courseId: z.string().uuid() });

export async function GET(_: Request, { params }: { params: { courseId: string } }) {
  const parse = paramsSchema.safeParse(params);
  if (!parse.success) {
    return NextResponse.json({ error: "Curso inválido" }, { status: 400 });
  }
  try {
    const detail = await getCourseWithLessons(parse.data.courseId);
    if (!detail) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ data: detail });
  } catch (err: any) {
    console.error("learning:course GET error", err);
    return NextResponse.json({ error: err?.message || "Erro ao carregar curso" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { courseId: string } }) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parse = paramsSchema.safeParse(params);
  if (!parse.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = CourseUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createClient();
    const { data: course } = await supabase
      .from("courses")
      .select("*")
      .eq("id", parse.data.courseId)
      .maybeSingle();

    if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const payload = parsed.data;
    const { data, error } = await supabase
      .from("courses")
      .update({
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        cover_url: payload.cover_url ?? undefined,
        tags: payload.tags ?? undefined,
        carga_horaria: payload.carga_horaria ?? undefined,
        status: payload.status ?? undefined,
        unit_id: payload.unit_id ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parse.data.courseId)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("learning:course PATCH error", err);
    return NextResponse.json({ error: err?.message || "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { courseId: string } }) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parse = paramsSchema.safeParse(params);
  if (!parse.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("org_id, unit_id")
    .eq("id", parse.data.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { error } = await supabase.from("courses").delete().eq("id", parse.data.courseId);
  if (error) {
    console.error("learning:course DELETE error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: true });
}
