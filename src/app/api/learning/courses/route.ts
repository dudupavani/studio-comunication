// src/app/api/learning/courses/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { listCoursesForUser } from "@/lib/learning/queries";
import { canManageCourse } from "@/lib/learning/access";
import {
  CourseCreateSchema,
  CourseUpdateSchema,
} from "@/lib/learning/validations";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const includeDrafts = scope === "manage";
    const data = await listCoursesForUser({ includeDrafts });
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("learning:courses GET error", err);
    return NextResponse.json({ error: err?.message || "Erro ao listar cursos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.orgId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = CourseCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    if (!canManageCourse(auth, auth.orgId, payload.unit_id ?? null)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .insert({
        org_id: auth.orgId,
        unit_id: payload.unit_id ?? null,
        title: payload.title,
        description: payload.description ?? null,
        cover_url: payload.cover_url ?? null,
        status: "draft",
        tags: payload.tags ?? [],
        carga_horaria: payload.carga_horaria ?? null,
        created_by: auth.userId,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("learning:courses POST error", err);
    return NextResponse.json({ error: err?.message || "Erro ao criar curso" }, { status: 500 });
  }
}
