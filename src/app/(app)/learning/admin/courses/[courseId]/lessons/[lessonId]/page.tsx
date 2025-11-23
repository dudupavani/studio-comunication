import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";
import { createServerClientReadOnly } from "@/lib/supabase/server";
import LessonEditorForm from "@/components/learning/LessonEditorForm";

const paramsSchema = {
  course: (params: { courseId: string }) => params.courseId,
  lesson: (params: { lessonId: string }) => params.lessonId,
};

async function resolveParams(
  params: { courseId: string; lessonId: string } | Promise<{ courseId: string; lessonId: string }>
) {
  const resolved = await Promise.resolve(params);
  return {
    courseId: paramsSchema.course(resolved),
    lessonId: paramsSchema.lesson(resolved),
  };
}

export default async function LessonAdminPage({
  params,
  searchParams,
}: {
  params: { courseId: string; lessonId: string } | Promise<{ courseId: string; lessonId: string }>;
  searchParams?: { module?: string };
}) {
  const { courseId, lessonId } = await resolveParams(params);
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");

  const supabase = createServerClientReadOnly();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(
      "id, title, description, content_html, video_url, liberada, course_id, module_id, course:courses!lessons_course_id_fkey(id, title, org_id, unit_id), module:course_modules!lessons_module_id_fkey(id, title)"
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    console.error("lesson fetch error", error);
    throw error;
  }
  if (!lesson || lesson.course?.id !== courseId) {
    return notFound();
  }

  if (!canManageCourse(auth, lesson.course.org_id as string, lesson.course.unit_id as string | null)) {
    redirect(`/learning/courses/${courseId}`);
  }

  const moduleName = lesson.module?.title ?? "Conteúdo";
  const moduleLink = `/learning/admin/courses/${courseId}?tab=content${searchParams?.module ? `#${searchParams.module}` : ""}`;

  return (
    <div className="p-4 space-y-4">
      <nav className="text-sm text-muted-foreground flex items-center gap-2">
        <Link href={moduleLink} className="text-primary hover:underline">
          {moduleName}
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{lesson.title}</span>
      </nav>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Editar aula</h1>
        <LessonEditorForm
          lessonId={lessonId}
          initial={{
            title: lesson.title ?? "",
            description: lesson.description ?? "",
            content_html: lesson.content_html ?? "",
            video_url: lesson.video_url ?? "",
            liberada: !!lesson.liberada,
          }}
        />
      </div>
    </div>
  );
}
