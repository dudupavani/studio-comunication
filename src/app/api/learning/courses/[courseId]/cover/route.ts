import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";

const paramsSchema = z.object({ courseId: z.string().uuid() });

async function ensureCourse(courseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, org_id, unit_id")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(request: Request, { params }: { params: { courseId: string } }) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(params);
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

  const supabase = createClient();
  const path = `${parsed.data.courseId}/cover.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("course-cover")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("course-cover").getPublicUrl(path);
  const coverUrl = publicUrlData.publicUrl
    ? `${publicUrlData.publicUrl}?t=${Date.now()}`
    : publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("courses")
    .update({ cover_url: coverUrl })
    .eq("id", parsed.data.courseId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { coverUrl } }, { status: 201 });
}

export async function DELETE(_: Request, { params }: { params: { courseId: string } }) {
  const auth = await getAuthContext();
  if (!auth?.orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Curso inválido" }, { status: 400 });

  const course = await ensureCourse(parsed.data.courseId);
  if (!course) return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const supabase = createClient();
  const path = `${parsed.data.courseId}/cover.jpg`;
  await supabase.storage.from("course-cover").remove([path]);
  const { error: updateError } = await supabase
    .from("courses")
    .update({ cover_url: null })
    .eq("id", parsed.data.courseId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: true });
}
