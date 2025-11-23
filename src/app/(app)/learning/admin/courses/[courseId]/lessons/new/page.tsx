import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";
import { createServerClientReadOnly } from "@/lib/supabase/server";
import LessonCreateForm from "@/components/learning/LessonCreateForm";

async function resolveParams(
  params: { courseId: string } | Promise<{ courseId: string }>
) {
  const resolved = await Promise.resolve(params);
  return resolved.courseId;
}

export default async function LessonNewPage({
  params,
  searchParams,
}: {
  params: { courseId: string } | Promise<{ courseId: string }>;
  searchParams?: { module?: string };
}) {
  const courseId = await resolveParams(params);
  const moduleId = searchParams?.module || null;

  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");

  const supabase = createServerClientReadOnly();
  const [{ data: course }, { data: module }] = await Promise.all([
    supabase.from("courses").select("id, org_id, unit_id, title").eq("id", courseId).maybeSingle(),
    moduleId
      ? supabase.from("course_modules").select("id, title").eq("id", moduleId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!course) return notFound();
  if (!canManageCourse(auth, course.org_id as string, course.unit_id as string | null)) {
    redirect(`/learning/courses/${course.id}`);
  }

  const moduleName = module?.title ?? "Conteúdo";
  const moduleLink = `/learning/admin/courses/${courseId}?tab=content${moduleId ? `#${moduleId}` : ""}`;

  return (
    <div className="p-4 space-y-4">
      <nav className="text-sm text-muted-foreground flex items-center gap-2">
        <Link href={moduleLink} className="text-primary hover:underline">
          {moduleName}
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Nova aula</span>
      </nav>

      <div className="space-y-3 max-w-3xl">
        <h1 className="text-2xl font-semibold">Nova aula para {moduleName}</h1>
        <LessonCreateForm courseId={courseId} moduleId={moduleId || undefined} redirectToEdit />
      </div>
    </div>
  );
}
