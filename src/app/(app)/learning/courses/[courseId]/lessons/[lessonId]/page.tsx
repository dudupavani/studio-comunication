import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthContext } from "@/lib/auth-context";
import { getCourseWithLessons } from "@/lib/learning/queries";

export const dynamic = "force-dynamic";

function renderVideoEmbed(url: string | null) {
  if (!url) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-md bg-black/5">
      <iframe
        src={url}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default async function LessonPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/onboarding");

  const course = await getCourseWithLessons(params.courseId);
  if (!course) return notFound();
  const lesson = course.lessons.find((l) => l.id === params.lessonId);
  if (!lesson) return notFound();

  const attachments = course.attachmentsByLesson[lesson.id] || [];
  const quizzes = course.quizzesByLesson[lesson.id] || [];

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{course.title}</span>
          <span>•</span>
          <span>Aula</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{lesson.title}</h1>
          {lesson.liberada ? <Badge variant="secondary">Liberada</Badge> : <Badge variant="outline">Bloqueada</Badge>}
        </div>
        {lesson.description ? <p className="text-muted-foreground">{lesson.description}</p> : null}
      </div>

      {renderVideoEmbed(lesson.video_url)}

      {lesson.content_html ? (
        <Card>
          <CardContent className="prose max-w-none p-4" dangerouslySetInnerHTML={{ __html: lesson.content_html }} />
        </Card>
      ) : null}

      {attachments.length ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold">Materiais da aula</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {attachments.map((att) => (
                <li key={att.id}>
                  <a className="text-primary hover:underline" href={att.file_url} target="_blank" rel="noreferrer">
                    {att.file_name}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {quizzes.length ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Quiz</h2>
              <span className="text-xs text-muted-foreground">{quizzes.length} pergunta(s)</span>
            </div>
            <div className="space-y-3">
              {quizzes.map((quiz, idx) => (
                <div key={quiz.id || idx} className="space-y-1">
                  <p className="font-medium text-sm">
                    {idx + 1}. {quiz.question}
                  </p>
                  <ul className="ml-4 list-disc text-sm text-muted-foreground">
                    {quiz.alternatives.map((alt, i) => (
                      <li key={`${quiz.id}-${i}`}>{alt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
