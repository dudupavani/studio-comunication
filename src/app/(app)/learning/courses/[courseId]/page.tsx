import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { canManageCourse } from "@/lib/learning/access";
import { LessonCreateForm } from "@/components/learning/LessonCreateForm";
import { getAuthContext } from "@/lib/auth-context";
import { getCourseWithLessons } from "@/lib/learning/queries";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");

  const course = await getCourseWithLessons(params.courseId);
  if (!course) return notFound();
  const canManage = canManageCourse(auth, course.org_id, course.unit_id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{course.title}</h1>
            {course.status !== "published" ? <Badge variant="outline">Rascunho</Badge> : null}
          </div>
          {course.description ? (
            <p className="text-muted-foreground max-w-3xl">{course.description}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Aulas</h2>
              <span className="text-xs text-muted-foreground">{course.lessons.length} aulas</span>
            </div>
            {canManage ? (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-medium mb-2">Adicionar nova aula</p>
                <LessonCreateForm courseId={course.id} />
              </div>
            ) : null}
            <div className="space-y-3">
              {course.lessons.map((lesson, idx) => (
                <Link
                  key={lesson.id}
                  href={`/learning/courses/${course.id}/lessons/${lesson.id}`}
                  className="block rounded-md border p-3 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      {lesson.liberada ? (
                        <Badge variant="secondary" className="text-[10px] uppercase">Liberada</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase">Bloqueada</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lesson.updated_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="mt-2 font-medium">{lesson.title}</h3>
                  {lesson.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                  ) : null}
                </Link>
              ))}
              {course.lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada ainda.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold">Prova final</h2>
            {course.exam ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Questões: {course.exam.questions.length}</div>
                <div>Nota mínima: {course.exam.nota_minima_aprovacao}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma prova configurada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
