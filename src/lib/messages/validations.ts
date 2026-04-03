// src/lib/messages/validations.ts
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

const mentionSchema = z
  .object({
    type: z.enum(["user", "all"]),
    userId: z.string().uuid({ message: "ID de usuário inválido" }).optional(),
    label: z
      .string()
      .trim()
      .max(255, "Rótulo muito longo")
      .optional()
      .nullable()
      .transform((val) => (val && val.length ? val : null)),
  })
  .superRefine((val, ctx) => {
    if (val.type === "user" && !val.userId) {
      ctx.addIssue({
        code: "custom",
        message: "Menção de usuário exige userId",
        path: ["userId"],
      });
    }
    if (val.type === "all" && val.userId) {
      ctx.addIssue({
        code: "custom",
        message: "Menção @TODOS não deve enviar userId",
        path: ["userId"],
      });
    }
  });

export const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Mensagem obrigatória")
    .max(5000, "Mensagem muito longa"),
  attachments: z.any().optional().nullable(),
  mentions: z.array(mentionSchema).max(50, "Menções demais na mensagem").default([]),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendMessageMentionInput = z.infer<typeof mentionSchema>;

export const addMemberSchema = z.object({
  userId: z.string().uuid({ message: "ID de usuário inválido" }),
  role: z.enum(["admin", "member"]).default("member"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const removeMemberSchema = z.object({
  userId: z.string().uuid({ message: "ID de usuário inválido" }),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const createMessagesPayloadSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(255),
  message: z.string().trim().min(1, "Mensagem obrigatória"),
  allowReplies: z.boolean().default(true),
  mode: z.enum(["group", "individual"]),
  userIds: z.array(z.string().uuid()).default([]),
  groupIds: z.array(z.string().uuid()).default([]),
  teamIds: z.array(z.string().uuid()).default([]),
});

export type CreateMessagesPayloadInput = z.infer<
  typeof createMessagesPayloadSchema
>;

const announcementMediaKindSchema = z
  .enum(["image", "video"])
  .optional();

const announcementMediaUrlSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().url("URL de mídia inválida").max(2048).optional());

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(255),
  content: z.string().trim().min(1, "Conteúdo obrigatório"),
  allowComments: z.boolean().default(true),
  allowReactions: z.boolean().default(true),
  mediaKind: announcementMediaKindSchema,
  mediaUrl: announcementMediaUrlSchema,
  mediaThumbnailUrl: announcementMediaUrlSchema,
  sendAt: z.coerce.date().optional(),
  userIds: z.array(z.string().uuid()).default([]),
  groupIds: z.array(z.string().uuid()).default([]),
  teamIds: z.array(z.string().uuid()).default([]),
}).superRefine((value, ctx) => {
  if (value.mediaKind && !value.mediaUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["mediaUrl"],
      message: "Informe a URL da mídia quando definir o tipo.",
    });
  }

  if (value.mediaThumbnailUrl && !value.mediaUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["mediaThumbnailUrl"],
      message: "Thumbnail exige URL da mídia principal.",
    });
  }
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

const sendAtInput = z
  .preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) return value;
    return new Date(String(value));
  }, z.date().nullable())
  .optional();

export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(255),
  content: z.string().trim().min(1, "Conteúdo obrigatório"),
  allowComments: z.boolean().default(true),
  allowReactions: z.boolean().default(true),
  mediaKind: announcementMediaKindSchema,
  mediaUrl: announcementMediaUrlSchema,
  mediaThumbnailUrl: announcementMediaUrlSchema,
  sendAt: sendAtInput,
  userIds: z.array(z.string().uuid()).default([]),
  groupIds: z.array(z.string().uuid()).default([]),
  teamIds: z.array(z.string().uuid()).default([]),
}).superRefine((value, ctx) => {
  if (value.mediaKind && !value.mediaUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["mediaUrl"],
      message: "Informe a URL da mídia quando definir o tipo.",
    });
  }

  if (value.mediaThumbnailUrl && !value.mediaUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["mediaThumbnailUrl"],
      message: "Thumbnail exige URL da mídia principal.",
    });
  }
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export const listAnnouncementsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
