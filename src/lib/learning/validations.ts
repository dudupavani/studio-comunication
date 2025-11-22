// src/lib/learning/validations.ts
import { z } from "zod";

const uuid = z.string().uuid();

const videoRegex = new RegExp(
  "^(https?:\\/\\/(www\\.)?(youtube\\.com|youtu\\.be|vimeo\\.com)\\/).+",
  "i"
);

export const CourseCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  tags: z.array(z.string().min(1)).max(20).default([]),
  carga_horaria: z.number().int().positive().nullable().optional(),
  unit_id: uuid.nullable().optional(),
});

export const CourseUpdateSchema = CourseCreateSchema.extend({
  status: z.enum(["draft", "published"]).optional(),
}).partial();

export const LessonCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).nullable().optional(),
  content_html: z.string().max(20000).nullable().optional(),
  video_url: z
    .string()
    .url()
    .regex(videoRegex, "Apenas links do YouTube ou Vimeo")
    .nullable()
    .optional(),
  liberada: z.boolean().default(false),
  ordem: z.number().int().positive().default(1),
  module_id: z.string().uuid().nullable().optional(),
});

export const LessonUpdateSchema = LessonCreateSchema.partial();

export const LessonReorderSchema = z.object({
  items: z.array(
    z.object({
      lessonId: uuid,
      ordem: z.number().int().positive(),
    })
  ),
});

export const LessonQuizSchema = z.object({
  id: uuid.optional(),
  question: z.string().min(5).max(2000),
  alternatives: z.array(z.string().min(1)).min(2).max(10),
  correct_index: z.number().int().min(0),
  ordem: z.number().int().positive().default(1),
});

export const LessonQuizUpsertSchema = z.object({
  lessonId: uuid,
  quizzes: z.array(LessonQuizSchema).max(10),
});

export const ExamQuestionSchema = z.object({
  id: uuid.optional(),
  question: z.string().min(5).max(2000),
  alternatives: z.array(z.string().min(1)).min(2).max(10),
  correct_index: z.number().int().min(0),
  ordem: z.number().int().positive().default(1),
});

export const ExamUpsertSchema = z.object({
  courseId: uuid,
  nota_minima_aprovacao: z.number().min(0).max(10),
  questions: z.array(ExamQuestionSchema).min(1).max(50),
});

export const ProgressUpdateSchema = z.object({
  lessonId: uuid,
  status: z.enum(["nao_iniciado", "em_andamento", "concluido"]),
  nota_quiz: z.number().min(0).max(10).nullable().optional(),
});

export const ReviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullable().optional(),
});

export type CourseCreateInput = z.infer<typeof CourseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof CourseUpdateSchema>;
export type LessonCreateInput = z.infer<typeof LessonCreateSchema>;
export type LessonUpdateInput = z.infer<typeof LessonUpdateSchema>;
export type LessonReorderInput = z.infer<typeof LessonReorderSchema>;
export type LessonQuizInput = z.infer<typeof LessonQuizSchema>;
export type ExamUpsertInput = z.infer<typeof ExamUpsertSchema>;
export type ProgressUpdateInput = z.infer<typeof ProgressUpdateSchema>;
export type ReviewCreateInput = z.infer<typeof ReviewCreateSchema>;
