// src/lib/helpdesk/validations.ts
import { z } from "zod";

export const createChatSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(255, "Nome muito longo")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val && val.length > 0 ? val : null)),
  type: z.enum(["direct", "group", "broadcast"]),
  allow_replies: z.boolean().default(true),
  memberIds: z
    .array(z.string().uuid({ message: "ID de usuário inválido" }))
    .default([]),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;

export const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Mensagem obrigatória")
    .max(5000, "Mensagem muito longa"),
  attachments: z.any().optional().nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const addMemberSchema = z.object({
  userId: z.string().uuid({ message: "ID de usuário inválido" }),
  role: z.enum(["admin", "member"]).default("member"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const createHelpdeskMessageSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(255),
  message: z.string().trim().min(1, "Mensagem obrigatória"),
  allowReplies: z.boolean().default(true),
  mode: z.enum(["group", "individual"]),
  userIds: z.array(z.string().uuid()).default([]),
  groupIds: z.array(z.string().uuid()).default([]),
});

export type CreateHelpdeskMessageInput = z.infer<
  typeof createHelpdeskMessageSchema
>;
