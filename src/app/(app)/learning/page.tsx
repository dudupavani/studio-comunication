import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthContext } from "@/lib/auth-context";
import { listCoursesForUser } from "@/lib/learning/queries";
import { canManageCourse } from "@/lib/learning/access";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");

  const includeDrafts = canManageCourse(auth, auth.orgId);
  const courses = await listCoursesForUser({ includeDrafts });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cursos</h1>
          <p className="text-sm text-muted-foreground">
            Acesse treinamentos publicados para a sua organização.
          </p>
        </div>
        {includeDrafts ? (
          <Link className="text-sm text-primary" href="/learning/admin">
            Gerenciar cursos
          </Link>
        ) : null}
      </div>

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum curso disponível ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/learning/courses/${course.id}`}>
              <Card className="h-full hover:border-primary transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight line-clamp-2">
                      {course.title}
                    </h3>
                    {course.status !== "published" ? (
                      <Badge variant="outline">Rascunho</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {course.description || "Sem descrição."}
                  </p>
                  {course.tags?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {course.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
