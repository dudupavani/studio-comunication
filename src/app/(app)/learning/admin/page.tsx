import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth-context";
import { listCoursesForUser } from "@/lib/learning/queries";
import { canManageCourse } from "@/lib/learning/access";

export const dynamic = "force-dynamic";

export default async function LearningAdminPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");
  if (!canManageCourse(auth, auth.orgId)) redirect("/learning");

  const courses = await listCoursesForUser({ includeDrafts: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cursos (Admin)</h1>
          <p className="text-sm text-muted-foreground">Gerencie cursos da organização.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/learning/admin/new">
            <Button>Criar curso</Button>
          </Link>
          <Link href="/learning">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum curso cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <Link key={course.id} href={`/learning/admin/courses/${course.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{course.title}</h3>
                      <Badge variant={course.status === "published" ? "secondary" : "outline"}>
                        {course.status === "published" ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description || "Sem descrição."}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>Atualizado: {new Date(course.updated_at).toLocaleDateString("pt-BR")}</div>
                    <div>Tags: {course.tags?.length ?? 0}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
