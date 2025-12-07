import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";

const paramsSchema = z.object({ courseId: z.string().uuid() });

async function ensureCourse(courseId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, org_id, unit_id")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/cover">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const course = await ensureCourse(parsed.data.courseId);
  if (!course) return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }

  const svc = createServiceClient();
  const path = `${parsed.data.courseId}/cover.jpg`;
  const { error: uploadError } = await svc.storage
    .from("course-cover")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = svc.storage.from("course-cover").getPublicUrl(path);
  const coverUrl = publicUrlData.publicUrl
    ? `${publicUrlData.publicUrl}?t=${Date.now()}`
    : publicUrlData.publicUrl;

  const { error: updateError } = await svc
    .from("courses")
    .update({ cover_url: coverUrl })
    .eq("id", parsed.data.courseId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { coverUrl } }, { status: 201 });
}

export async function DELETE(
  _: Request,
  context: RouteContext<"/api/learning/courses/[courseId]/cover">
) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const course = await ensureCourse(parsed.data.courseId);
  if (!course) return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const svc = createServiceClient();
  const path = `${parsed.data.courseId}/cover.jpg`;
  await svc.storage.from("course-cover").remove([path]);
  const { error: updateError } = await svc
    .from("courses")
    .update({ cover_url: null })
    .eq("id", parsed.data.courseId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: true });
}
