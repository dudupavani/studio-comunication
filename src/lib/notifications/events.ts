import { z } from "zod";
import type {
  NotificationEvent,
  NotificationEventPayloads,
  NotificationEventType,
} from "./types";

const EVENT_TYPES: NotificationEventType[] = [
  "chat.message_received",
  "chat.mention",
  "announcement.sent",
  "designer.asset_ready",
  "calendar.event_created",
];

type NotificationEventInput = Omit<NotificationEvent, "payload"> & {
  payload: unknown;
};

type NormalizedEvent = {
  eventType: NotificationEventType;
  orgId: string;
  actorId: string;
  actorName?: string | null;
  targetUserIds: string[];
  payload: NotificationEventPayloads[NotificationEventType];
};

const chatMessagePayloadSchema = z.object({
  chatId: z.string().uuid(),
  chatName: z.string().trim().max(255).nullable().optional(),
  messageId: z.union([z.number(), z.string()]),
  preview: z.string().trim().max(5000).nullable().optional(),
});

const chatMentionPayloadSchema = z.object({
  chatId: z.string().uuid(),
  chatName: z.string().trim().max(255).nullable().optional(),
  messageId: z.union([z.number(), z.string()]),
  preview: z.string().trim().max(5000).nullable().optional(),
  mentionType: z.enum(["user", "all"]),
  mentionedUserId: z.string().uuid().nullable().optional(),
});

const announcementPayloadSchema = z.object({
  announcementId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  excerpt: z.string().trim().max(5000).nullable().optional(),
});

const designerPayloadSchema = z.object({
  assetId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
});

const calendarPayloadSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  startsAt: z.string().datetime().nullable().optional(),
});

const payloadSchemas: Record<
  NotificationEventType,
  z.ZodSchema<NotificationEventPayloads[NotificationEventType]>
> = {
  "chat.message_received": chatMessagePayloadSchema,
  "chat.mention": chatMentionPayloadSchema,
  "announcement.sent": announcementPayloadSchema,
  "designer.asset_ready": designerPayloadSchema,
  "calendar.event_created": calendarPayloadSchema,
};

const baseSchema = z.object({
  eventType: z.enum(EVENT_TYPES as [NotificationEventType, ...NotificationEventType[]]),
  orgId: z.string().uuid(),
  actorId: z.string().uuid(),
  actorName: z.string().trim().max(255).nullable().optional(),
  targetUserIds: z.array(z.string().uuid()).min(1),
  payload: z.unknown(),
});

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function validateNotificationEvent(input: NotificationEventInput): NormalizedEvent {
  const parsedBase = baseSchema.parse({
    ...input,
    targetUserIds: input.targetUserIds ?? [],
  });

  const payloadSchema = payloadSchemas[parsedBase.eventType];
  const payload = payloadSchema.parse(input.payload);

  return {
    eventType: parsedBase.eventType,
    orgId: parsedBase.orgId,
    actorId: parsedBase.actorId,
    actorName: parsedBase.actorName ?? null,
    targetUserIds: uniqueIds(parsedBase.targetUserIds),
    payload,
  };
}

export type { NotificationEventInput };
export type NormalizedNotificationEvent<
  E extends NotificationEventType = NotificationEventType,
> = Omit<NormalizedEvent, "eventType" | "payload"> & {
  eventType: E;
  payload: NotificationEventPayloads[E];
};
