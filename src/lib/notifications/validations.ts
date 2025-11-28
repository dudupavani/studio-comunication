import { z } from "zod";
import { Constants } from "@/types/supabase";

type NotificationTypeOption = (typeof Constants.public.Enums.notification_type)[number];
const NOTIFICATION_TYPES = [
  ...Constants.public.Enums.notification_type,
] as [NotificationTypeOption, ...NotificationTypeOption[]];

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const listNotificationsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  unread: z.boolean().optional(),
  types: z.array(notificationTypeSchema).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const markReadSchema = z
  .object({
    ids: z.array(z.string().uuid()).default([]),
    all: z.boolean().optional(),
    read: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (!value.all && (!value.ids || value.ids.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe ids ou utilize all=true",
        path: ["ids"],
      });
    }
  });

export type MarkReadInput = z.infer<typeof markReadSchema>;

export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url("Endpoint inválido"),
  keys: z.object({
    p256dh: z.string().min(1, "Chave p256dh obrigatória"),
    auth: z.string().min(1, "Chave auth obrigatória"),
  }),
  userAgent: z.string().optional(),
});

export type CreatePushSubscriptionInput = z.infer<typeof createPushSubscriptionSchema>;
