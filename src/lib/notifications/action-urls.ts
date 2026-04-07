import type { NotificationType } from "./types";


export function announcementActionUrl(announcementId: string) {
  return `/comunicados/${announcementId}`;
}


export function calendarEventActionUrl(eventId: string) {
  return `/calendar?eventId=${eventId}`;
}

export function inboxFallbackUrl() {
  return "/inbox";
}

export function resolveActionUrl(
  type: NotificationType,
  metadata: Record<string, unknown>
) {
  const meta = metadata || {};
  switch (type) {

    case "announcement.sent": {
      const announcementId = String(
        (meta as any).announcement_id ?? (meta as any).announcementId ?? ""
      ).trim();
      return announcementId
        ? announcementActionUrl(announcementId)
        : inboxFallbackUrl();
    }

    case "calendar.event_created": {
      const eventId = String(
        (meta as any).event_id ?? (meta as any).eventId ?? ""
      ).trim();
      return eventId ? calendarEventActionUrl(eventId) : "/calendar";
    }
    default:
      return inboxFallbackUrl();
  }
}
