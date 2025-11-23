import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getCourseWithLessons } from "@/lib/learning/queries";
import { canManageCourse } from "@/lib/learning/access";
import Link from "next/link";
import CourseDetailsForm from "@/components/learning/CourseDetailsForm";
import ContentModules from "@/components/learning/ContentModules";
import ExamEditorForm from "@/components/learning/ExamEditorForm";
import QuizSection from "@/components/learning/QuizSection";
import AudienceSection from "@/components/learning/AudienceSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, Layers, ListChecks, ShieldCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CourseAdminPage({
  params,
  searchParams,
}: {
  params: { courseId: string } | Promise<{ courseId: string }>;
  searchParams?: { tab?: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const courseId = resolvedParams.courseId;
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");

  const course = await getCourseWithLessons(courseId);
  if (!course) return notFound();
  if (!canManageCourse(auth as any, course.org_id, course.unit_id))
    redirect(`/learning/courses/${course.id}`);

  const activeTab =
    searchParams?.tab &&
    ["details", "content", "quiz", "exam", "audience"].includes(
      searchParams.tab
    )
      ? searchParams.tab
      : "details";

  const menuItems = [
    { key: "details", label: "Detalhes", icon: BookOpen },
    { key: "content", label: "Conteúdo", icon: Layers },
    { key: "quiz", label: "Quiz", icon: ListChecks },
    { key: "exam", label: "Provas", icon: ShieldCheck },
    { key: "audience", label: "Público", icon: Users },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case "details":
        return (
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-semibold">Detalhes do curso</h1>
              <p className="text-sm text-muted-foreground">
                Título, descrição, capa, status e tags.
              </p>
            </div>
            <Card>
              <CardContent className="p-4">
                <CourseDetailsForm
                  courseId={course.id}
                  initial={{
                    title: course.title,
                    description: course.description,
                    cover_url: course.cover_url,
                    carga_horaria: course.carga_horaria,
                    status: course.status,
                    tags: course.tags,
                  }}
                />
              </CardContent>
            </Card>
          </div>
        );
      case "content":
        return (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Conteúdo</h2>
              <p className="text-sm text-muted-foreground">
                Organize o curso em módulos e aulas.
              </p>
            </div>
            <ContentModules
              courseId={course.id}
              modules={course.modules}
              lessons={course.lessons}
            />
          </div>
        );
      case "quiz":
        return (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Quiz</h2>
              <p className="text-sm text-muted-foreground">
                Crie perguntas rápidas por aula.
              </p>
            </div>
            <QuizSection />
          </div>
        );
      case "exam":
        return (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Provas</h2>
              <p className="text-sm text-muted-foreground">
                Monte a avaliação final com múltipla escolha.
              </p>
            </div>
            <Card>
              <CardContent className="p-4">
                <ExamEditorForm courseId={course.id} />
              </CardContent>
            </Card>
          </div>
        );
      case "audience":
      default:
        return (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Público</h2>
              <p className="text-sm text-muted-foreground">
                Defina grupos e usuários que podem acessar.
              </p>
            </div>
            <AudienceSection />
          </div>
        );
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="grid gap-6 md:grid-cols-[160px_1fr]">
        <div className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const href = `?tab=${item.key}`;
            return (
              <Link key={item.key} href={href}>
                <Button
                  type="button"
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="space-y-6">{renderTab()}</div>
      </div>
    </div>
  );
}
