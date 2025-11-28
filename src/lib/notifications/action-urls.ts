import type { NotificationType } from "./types";

export function chatActionUrl(chatId: string) {
  return `/chats/${chatId}`;
}

export function announcementActionUrl(announcementId: string) {
  return `/comunicados/${announcementId}`;
}

export function designerAssetActionUrl(assetId: string) {
  return `/design-editor/${assetId}`;
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
    case "chat.message":
    case "chat.mention": {
      const chatId = String(
        (meta as any).chat_id ?? (meta as any).chatId ?? ""
      ).trim();
      return chatId ? chatActionUrl(chatId) : inboxFallbackUrl();
    }
    case "announcement.sent": {
      const announcementId = String(
        (meta as any).announcement_id ?? (meta as any).announcementId ?? ""
      ).trim();
      return announcementId
        ? announcementActionUrl(announcementId)
        : inboxFallbackUrl();
    }
    case "designer.asset_ready": {
      const assetId = String(
        (meta as any).asset_id ?? (meta as any).assetId ?? ""
      ).trim();
      return assetId ? designerAssetActionUrl(assetId) : inboxFallbackUrl();
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
