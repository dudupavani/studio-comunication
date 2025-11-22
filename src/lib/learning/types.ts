// src/lib/learning/types.ts
import type { Json } from "@/lib/supabase/types";

export type CourseStatus = "draft" | "published";

export type Course = {
  id: string;
  org_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: CourseStatus;
  tags: string[];
  carga_horaria: number | null;
  avaliacao_media: number;
  quantidade_avaliacoes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  ordem: number;
  created_at: string;
};

export type Lesson = {
  id: string;
  course_id: string;
  module_id?: string | null;
  title: string;
  description: string | null;
  ordem: number;
  content_html: string | null;
  video_url: string | null;
  liberada: boolean;
  created_at: string;
  updated_at: string;
};

export type LessonAttachment = {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
};

export type LessonQuiz = {
  id: string;
  lesson_id: string;
  question: string;
  alternatives: string[];
  correct_index: number;
  ordem: number;
};

export type Exam = {
  id: string;
  course_id: string;
  nota_minima_aprovacao: number;
  created_at: string;
};

export type ExamQuestion = {
  id: string;
  exam_id: string;
  question: string;
  alternatives: string[];
  correct_index: number;
  ordem: number;
};

export type CourseProgressStatus =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido";

export type CourseProgress = {
  user_id: string;
  course_id: string;
  lesson_id: string;
  status: CourseProgressStatus;
  nota_quiz: number | null;
  nota_prova_final: number | null;
  data_conclusao: string | null;
};

export type CourseReview = {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type CourseDetail = Course & {
  modules: CourseModule[];
  lessons: Lesson[];
  quizzesByLesson: Record<string, LessonQuiz[]>;
  attachmentsByLesson: Record<string, LessonAttachment[]>;
  exam: (Exam & { questions: ExamQuestion[] }) | null;
};

// Auxiliar para uploads de anexos
export type SignedUpload = {
  url: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  fields?: Json;
};
