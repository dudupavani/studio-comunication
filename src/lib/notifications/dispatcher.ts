import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/log";
import {
  announcementActionUrl,
  calendarEventActionUrl,
  inboxFallbackUrl,
} from "./action-urls";
import {
  validateNotificationEvent,
  type NotificationEventInput,
  type NormalizedNotificationEvent,
} from "./events";
import type {
  NotificationEventType,
  NotificationInsert,
  NotificationType,
} from "./types";

type DispatchResult = {
  inserted: number;
  attempted: number;
  recipients: number;
  errors: Array<{ chunk: number; reason: string }>;
  skippedTargets: string[];
};

const INSERT_BATCH_SIZE = 200;

function chunk<T>(items: T[], size: number) {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function truncate(value: string | null | undefined, max = 240) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function filterOrgRecipients(orgId: string, userIds: string[]) {
  if (!userIds.length) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .in("user_id", userIds);

  if (error) {
    logError("NOTIFICATIONS dispatcher recipients", error, { orgId });
    return [];
  }

  return (data ?? []).map((row: any) => row.user_id as string);
}

function baseDraft(event: NormalizedNotificationEvent, userId: string) {
  return {
    org_id: event.orgId,
    user_id: userId,
    read_at: null,
  } satisfies Pick<NotificationInsert, "org_id" | "user_id" | "read_at">;
}


function buildAnnouncementDraft(
  event: NormalizedNotificationEvent<"announcement.sent">,
  recipient: string
): NotificationInsert {
  const metadata = {
    announcement_id: event.payload.announcementId,
    actor_id: event.actorId,
  };

  const body = truncate(event.payload.excerpt, 280) ?? "Você recebeu um comunicado";
  return {
    ...baseDraft(event, recipient),
    type: "announcement.sent",
    title: `Novo comunicado: ${event.payload.title}`,
    message: body,
    body,
    action_url: announcementActionUrl(event.payload.announcementId),
    metadata,
  };
}


function buildCalendarDraft(
  event: NormalizedNotificationEvent<"calendar.event_created">,
  recipient: string
): NotificationInsert {
  const metadata = {
    event_id: event.payload.eventId,
    actor_id: event.actorId,
    starts_at: event.payload.startsAt ?? null,
  };

  const body = event.payload.startsAt
    ? `Agendado para ${event.payload.startsAt}`
    : "Agendado no calendário";
  return {
    ...baseDraft(event, recipient),
    type: "calendar.event_created",
    title: `Novo evento: ${event.payload.title}`,
    message: body,
    body,
    action_url: calendarEventActionUrl(event.payload.eventId),
    metadata,
  };
}

const HANDLERS: Record<
  NotificationEventType,
  (event: NormalizedNotificationEvent, recipients: string[]) => NotificationInsert[]
> = {
  "announcement.sent": (event, recipients) =>
    recipients.map((userId) => buildAnnouncementDraft(event as any, userId)),
  "calendar.event_created": (event, recipients) =>
    recipients.map((userId) => buildCalendarDraft(event as any, userId)),
};

async function insertNotifications(rows: NotificationInsert[]): Promise<DispatchResult> {
  if (!rows.length) {
    return { attempted: 0, inserted: 0, recipients: 0, errors: [], skippedTargets: [] };
  }

  const supabase = createServiceClient();
  const batches = chunk(rows, INSERT_BATCH_SIZE);
  let inserted = 0;
  const errors: Array<{ chunk: number; reason: string }> = [];

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const { error } = await supabase.from("notifications").insert(batch);
    if (error) {
      errors.push({ chunk: i, reason: error.message ?? "insert_error" });
      logError("NOTIFICATIONS dispatcher insert", error, { batchIndex: i });
      continue;
    }
    inserted += batch.length;
  }

  return {
    attempted: rows.length,
    inserted,
    recipients: new Set(rows.map((row) => row.user_id)).size,
    errors,
    skippedTargets: [],
  };
}

function prepareRealtime(rows: NotificationInsert[]) {
  // Placeholder para futuro websocket/Realtime; o supabase já publica a tabela.
  return rows.map((row) => ({
    userId: row.user_id,
    type: row.type as NotificationType,
    actionUrl: row.action_url ?? inboxFallbackUrl(),
  }));
}

function preparePush(rows: NotificationInsert[]) {
  // Camada reservada para push notifications (service worker).
  return rows.map((row) => ({
    userId: row.user_id,
    payload: {
      title: row.title,
      body: row.body,
      actionUrl: row.action_url,
      type: row.type,
    },
  }));
}

export async function dispatchNotificationEvent(input: NotificationEventInput) {
  const normalized = validateNotificationEvent(input);
  const targets = normalized.targetUserIds.filter(
    (id) => id && id !== normalized.actorId
  );
  if (!targets.length) {
    return {
      attempted: 0,
      inserted: 0,
      recipients: 0,
      errors: [],
      skippedTargets: normalized.targetUserIds,
    } satisfies DispatchResult;
  }

  const allowedTargets = await filterOrgRecipients(normalized.orgId, targets);
  const skippedTargets = targets.filter((id) => !allowedTargets.includes(id));

  const handler = HANDLERS[normalized.eventType];
  if (!handler) {
    return {
      attempted: 0,
      inserted: 0,
      recipients: 0,
      errors: [{ chunk: 0, reason: `handler_not_found:${normalized.eventType}` }],
      skippedTargets,
    } satisfies DispatchResult;
  }

  const drafts = handler(normalized, allowedTargets);
  const result = await insertNotifications(drafts);
  result.skippedTargets = skippedTargets;

  // Prepara camadas futuras (realtime/push) sem disparar ainda
  prepareRealtime(drafts);
  preparePush(drafts);

  return result;
}

export async function publishNotificationEvent(input: NotificationEventInput) {
  return dispatchNotificationEvent(input);
}
