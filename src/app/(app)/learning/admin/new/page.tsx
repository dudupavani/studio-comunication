import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth-context";
import { canManageCourse } from "@/lib/learning/access";
import { CourseCreateForm } from "@/components/learning/CourseCreateForm";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");
  if (!canManageCourse(auth, auth.orgId)) redirect("/learning");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Novo curso</h1>
          <p className="text-sm text-muted-foreground">
            Crie um curso em rascunho e depois adicione aulas e avaliações.
          </p>
        </div>
        <Link href="/learning/admin">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <CourseCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
