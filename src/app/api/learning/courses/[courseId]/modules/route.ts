// src/app/api/learning/courses/[courseId]/modules/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse, canViewCourse } from "@/lib/learning/access";

const paramsSchema = z.object({ courseId: z.string().uuid() });
const bodySchema = z.object({ title: z.string().min(3).max(200), ordem: z.number().int().positive().optional() });

async function resolveParams(
  params: { courseId: string } | Promise<{ courseId: string }>
) {
  const resolved = await Promise.resolve(params);
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) throw new Error("Curso inválido");
  return parsed.data;
}

export async function GET(
  _: Request,
  { params }: { params: { courseId: string } | Promise<{ courseId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  let parsed;
  try {
    parsed = await resolveParams(params);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Curso inválido" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, org_id, unit_id, status")
    .eq("id", parsed.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const allowed =
    canViewCourse(auth, course.org_id as string, course.unit_id as string | null) ||
    canManageCourse(auth, course.org_id as string, course.unit_id as string | null);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data, error } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", parsed.courseId)
    .order("ordem", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } | Promise<{ courseId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  let parsedParams;
  try {
    parsedParams = await resolveParams(params);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Curso inválido" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, org_id, unit_id")
    .eq("id", parsedParams.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("course_modules")
    .insert({
      course_id: parsedParams.courseId,
      title: parsedBody.data.title,
      ordem: parsedBody.data.ordem ?? 1,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
