// src/lib/learning/queries.ts
import { createServerClientReadOnly } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import type {
  Course,
  CourseDetail,
  CourseModule,
  Lesson,
  LessonAttachment,
  LessonQuiz,
  Exam,
  ExamQuestion,
  CourseProgress,
} from "./types";
import { canManageCourse, canViewCourse } from "./access";

export async function listCoursesForUser(params?: { includeDrafts?: boolean }) {
  const auth = await getAuthContext();
  if (!auth?.orgId) throw new Error("Unauthorized");
  const supabase = createServerClientReadOnly();

  const includeDrafts = params?.includeDrafts && canManageCourse(auth, auth.orgId);
  let query = supabase
    .from("courses")
    .select("*")
    .eq("org_id", auth.orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (!includeDrafts) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Course[]) ?? [];
}

export async function getCourseWithLessons(courseId: string): Promise<CourseDetail | null> {
  const auth = await getAuthContext();
  if (!auth?.orgId) throw new Error("Unauthorized");
  const supabase = createServerClientReadOnly();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) throw error;
  if (!course) return null;

  const typedCourse = course as Course;
  const allowed =
    canViewCourse(auth, typedCourse.org_id, typedCourse.unit_id) ||
    canManageCourse(auth, typedCourse.org_id, typedCourse.unit_id);

  if (!allowed) return null;
  if (typedCourse.status !== "published" && !canManageCourse(auth, typedCourse.org_id, typedCourse.unit_id)) {
    return null;
  }

  const modulesRes = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("ordem", { ascending: true });

  let modules: CourseModule[] = [];
  if (modulesRes.error) {
    if ((modulesRes.error as any)?.code !== "42P01") {
      throw modulesRes.error;
    }
  } else {
    modules = (modulesRes.data as CourseModule[]) ?? [];
  }

  const lessonsRes = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("ordem", { ascending: true });

  if (lessonsRes.error) throw lessonsRes.error;
  const lessons = (lessonsRes.data as Lesson[]) ?? [];
  const lessonIds = lessons.map((l) => l.id);

  const [attachmentsRes, quizzesRes] = await Promise.all([
    lessonIds.length
      ? supabase.from("lesson_attachments").select("*").in("lesson_id", lessonIds)
      : supabase.from("lesson_attachments").select("*").limit(0),
    lessonIds.length
      ? supabase
          .from("lesson_quizzes")
          .select("*")
          .in("lesson_id", lessonIds)
          .order("ordem", { ascending: true })
      : supabase.from("lesson_quizzes").select("*").limit(0),
  ]);

  const examRes = await supabase.from("exams").select("*").eq("course_id", courseId).maybeSingle();
  const examId = (examRes.data as Exam | null)?.id;
  const examQuestionsRes = await (examId
    ? supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", examId)
        .order("ordem", { ascending: true })
    : supabase.from("exam_questions").select("*").limit(0));

  if (attachmentsRes.error) throw attachmentsRes.error;
  if (quizzesRes.error) throw quizzesRes.error;
  if (examRes.error) throw examRes.error;
  if (examQuestionsRes.error) throw examQuestionsRes.error;
  const attachmentsByLesson: Record<string, LessonAttachment[]> = {};
  (attachmentsRes.data as LessonAttachment[] | null)?.forEach((att) => {
    const list = attachmentsByLesson[att.lesson_id] || [];
    list.push(att);
    attachmentsByLesson[att.lesson_id] = list;
  });

  const quizzesByLesson: Record<string, LessonQuiz[]> = {};
  (quizzesRes.data as LessonQuiz[] | null)?.forEach((quiz) => {
    const list = quizzesByLesson[quiz.lesson_id] || [];
    list.push(quiz);
    quizzesByLesson[quiz.lesson_id] = list;
  });

  const exam = examRes.data as Exam | null;
  const examQuestions = (examQuestionsRes.data as ExamQuestion[] | null) ?? [];
  const detail: CourseDetail = {
    ...(typedCourse as Course),
    modules,
    lessons,
    attachmentsByLesson,
    quizzesByLesson,
    exam: exam
      ? {
          ...exam,
          questions: examQuestions.filter((q) => q.exam_id === exam.id),
        }
      : null,
  };
  return detail;
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const supabase = createServerClientReadOnly();
  const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (error) throw error;
  return (data as Lesson) ?? null;
}

export async function getProgressForUser(courseId: string, userId: string): Promise<CourseProgress[]> {
  const supabase = createServerClientReadOnly();
  const { data, error } = await supabase
    .from("course_progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data as CourseProgress[]) ?? [];
}
