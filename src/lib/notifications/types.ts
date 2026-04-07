import type { Tables, TablesInsert, Enums } from "@/lib/supabase/types";

export type NotificationType = Enums<"notification_type">;

export type NotificationRow = Tables<"notifications">;
export type NotificationInsert = TablesInsert<"notifications">;

export type NotificationEventType =
  | "announcement.sent"
  | "calendar.event_created";

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

export type NotificationEventPayloads = {
  "announcement.sent": AnnouncementSentPayload;
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
