import type { Tables, TablesInsert, Enums } from "@/lib/supabase/types";

export type NotificationType = Enums<"notification_type">;

export type NotificationRow = Tables<"notifications">;
export type NotificationInsert = TablesInsert<"notifications">;

export type NotificationEventType =
  | "chat.message_received"
  | "chat.mention"
  | "announcement.sent"
  | "designer.asset_ready"
  | "calendar.event_created";

export type ChatMessageReceivedPayload = {
  chatId: string;
  chatName?: string | null;
  messageId: number | string;
  preview?: string | null;
};

export type ChatMentionPayload = ChatMessageReceivedPayload & {
  mentionType: "user" | "all";
  mentionedUserId?: string | null;
};

export type AnnouncementSentPayload = {
  announcementId: string;
  title: string;
  excerpt?: string | null;
};


export type CalendarEventCreatedPayload = {
  eventId: string;
  title: string;
  startsAt?: string | null;
};

export type DesignerAssetReadyPayload = {
  assetId: string;
  title: string;
};

export type NotificationEventPayloads = {
  "chat.message_received": ChatMessageReceivedPayload;
  "chat.mention": ChatMentionPayload;
  "announcement.sent": AnnouncementSentPayload;
  "designer.asset_ready": DesignerAssetReadyPayload;
  "calendar.event_created": CalendarEventCreatedPayload;
};

export type NotificationEvent<E extends NotificationEventType = NotificationEventType> =
  E extends NotificationEventType
    ? {
        eventType: E;
        orgId: string;
        actorId: string;
        targetUserIds: string[];
        payload: NotificationEventPayloads[E];
        actorName?: string | null;
      }
    : never;

export type NotificationActionUrlBuilder = (metadata: Record<string, unknown>) => string;
