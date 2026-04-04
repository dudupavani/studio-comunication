import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import { updateAnnouncementSchema } from "@/lib/messages/validations";
import { canManageAnnouncement } from "@/lib/messages/announcement-access";
import { resolveAnnouncementMediaFields } from "@/lib/messages/announcement-media";
import { logError } from "@/lib/log";
import type { Database } from "@/lib/supabase/types";

function buildAnnouncementSnippet(content: string) {
  const plain = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) {
    return "Novo comunicado disponível.";
  }
  const limit = 200;
  return plain.length > limit ? `${plain.slice(0, limit - 1).trim()}…` : plain;
}

async function removeCalendarEvent(
  svc: ReturnType<typeof createServiceClient>,
  eventId: string | null,
  orgId: string
) {
  if (!eventId) return;
  try {
    await svc.from("calendar_events").delete().eq("id", eventId).eq("org_id", orgId);
  } catch (err) {
    logError("ANNOUNCEMENTS remove calendar error", { err, eventId, orgId });
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext<"/api/messages/announcements/[announcementId]">
) {
  try {
    const { announcementId } = await context.params;
    const supabaseUser = createServerClientWithCookies();
    const svc = createServiceClient();
    const auth = await getAuthContext(supabaseUser);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }
    const raw = await req.json().catch(() => null);
    const parsed = updateAnnouncementSchema.safeParse(raw ?? {});

    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Payload inválido"
      );
    }

    const { data: existing, error: loadErr } = await svc
      .from("announcements")
      .select(
        "id, org_id, author_id, title, content, allow_comments, allow_reactions, media_kind, media_url, media_thumbnail_url, send_at, sent_at, status, calendar_event_id"
      )
      .eq("id", announcementId)
      .maybeSingle();

    if (
      loadErr ||
      !existing ||
      (!auth.isPlatformAdmin && existing.org_id !== auth.orgId)
    ) {
      return errorResponse(404, "not_found", "Comunicado não encontrado.");
    }

    if (!canManageAnnouncement(auth, existing)) {
      return errorResponse(
        403,
        "forbidden",
        "Apenas o autor, o master da matriz ou o admin global podem editá-lo."
      );
    }

    const workingOrgId = existing.org_id;

    const payload = parsed.data;
    const hasMediaOverride =
      payload.mediaKind !== undefined ||
      payload.mediaUrl !== undefined ||
      payload.mediaThumbnailUrl !== undefined;
    const resolvedMedia = resolveAnnouncementMediaFields({
      content: payload.content,
      mediaKind: payload.mediaKind,
      mediaUrl: payload.mediaUrl,
      mediaThumbnailUrl: payload.mediaThumbnailUrl,
    });
    const mediaPatch = hasMediaOverride
      ? resolvedMedia
      : {
          media_kind: (existing.media_kind as "image" | "video" | null) ?? null,
          media_url: (existing.media_url as string | null) ?? null,
          media_thumbnail_url:
            (existing.media_thumbnail_url as string | null) ?? null,
        };

    const userIdSet = new Set<string>(
      (payload.userIds ?? []).filter((id): id is string => !!id)
    );
    const groupIds = Array.from(new Set(payload.groupIds ?? [])).filter(Boolean);
    const teamIds = Array.from(new Set(payload.teamIds ?? [])).filter(Boolean);

    if (teamIds.length > 0) {
      const { data: teamMembers, error: teamMembersError } = await supabaseUser
        .from("equipe_members")
        .select("user_id")
        .in("equipe_id", teamIds)
        .eq("org_id", workingOrgId);

      if (teamMembersError) {
        logError("ANNOUNCEMENTS update load team members", teamMembersError);
        return errorResponse(500, "db_error", "Falha ao carregar membros das equipes");
      }

      (teamMembers ?? []).forEach((row: any) => {
        if (row?.user_id) userIdSet.add(row.user_id as string);
      });
    }

    if (groupIds.length > 0) {
      const { data: groupMembers, error: groupMembersError } = await supabaseUser
        .from("user_group_members")
        .select("user_id")
        .in("group_id", groupIds)
        .eq("org_id", workingOrgId);

      if (groupMembersError) {
        logError("ANNOUNCEMENTS update load group members", groupMembersError);
        return errorResponse(500, "db_error", "Falha ao carregar membros dos grupos");
      }

      (groupMembers ?? []).forEach((row: any) => {
        if (row?.user_id) userIdSet.add(row.user_id as string);
      });
    }

    const userIds = Array.from(userIdSet);
    if (userIds.length === 0 && groupIds.length === 0) {
      return errorResponse(
        400,
        "validation_error",
        "Selecione ao menos um destinatário (usuário, grupo ou equipe)."
      );
    }

    const now = Date.now();
    const sendAtDate = payload.sendAt ?? null;
    const sendAtIso =
      sendAtDate && !Number.isNaN(sendAtDate.getTime())
        ? sendAtDate.toISOString()
        : null;
    const isScheduling = !!sendAtIso && sendAtDate!.getTime() > now + 15000;

    const currentStatus = (existing.status as "sent" | "scheduled" | null) ?? "sent";
    if (currentStatus === "sent" && isScheduling) {
      return errorResponse(
        400,
        "not_allowed",
        "Não é possível reagendar um comunicado já enviado."
      );
    }

    const nextStatus: "sent" | "scheduled" =
      currentStatus === "sent" ? "sent" : isScheduling ? "scheduled" : "sent";
    const willSendNow = currentStatus !== "sent" && nextStatus === "sent";
    const sentAtIso =
      nextStatus === "sent"
        ? existing.sent_at ?? new Date().toISOString()
        : null;

    const { error: updateErr } = await svc
      .from("announcements")
      .update({
        title: payload.title.trim(),
        content: payload.content,
        allow_comments: payload.allowComments,
        allow_reactions: payload.allowReactions,
        media_kind: mediaPatch.media_kind,
        media_url: mediaPatch.media_url,
        media_thumbnail_url: mediaPatch.media_thumbnail_url,
        send_at: nextStatus === "scheduled" ? sendAtIso : null,
        status: nextStatus,
        sent_at: nextStatus === "sent" ? sentAtIso : null,
      })
      .eq("id", announcementId)
      .eq("org_id", workingOrgId);

    if (updateErr) {
      logError("ANNOUNCEMENTS update error", updateErr);
      return errorResponse(500, "db_error", "Falha ao atualizar comunicado");
    }

    await svc
      .from("announcement_recipients")
      .delete()
      .eq("announcement_id", announcementId);

    const recipientRows = [
      ...userIds.map((id) => ({
        announcement_id: announcementId,
        org_id: workingOrgId,
        user_id: id,
        group_id: null,
      })),
      ...groupIds.map((id) => ({
        announcement_id: announcementId,
        org_id: workingOrgId,
        user_id: null,
        group_id: id,
      })),
    ];

    if (recipientRows.length > 0) {
      const { error: recipientsErr } = await svc
        .from("announcement_recipients")
        .insert(recipientRows);

      if (recipientsErr) {
        logError("ANNOUNCEMENTS update recipients error", recipientsErr);
        return errorResponse(
          500,
          "db_error",
          "Falha ao salvar destinatários do comunicado"
        );
      }
    }

    if (nextStatus === "scheduled" && sendAtIso) {
      const markerEndIso = new Date(
        sendAtDate!.getTime() + 5 * 60 * 1000
      ).toISOString();
      const snippet = buildAnnouncementSnippet(payload.content);
      const eventTitle = payload.title.slice(0, 180);

      if (existing.calendar_event_id) {
        const { error: calendarUpdateErr } = await svc
          .from("calendar_events")
          .update({
            title: `Comunicado: ${eventTitle}`,
            description: snippet,
            start_time: sendAtIso,
            end_time: markerEndIso,
            all_day: false,
            metadata: {
              kind: "announcement",
              announcement_id: announcementId,
              title: payload.title,
            } satisfies Database["public"]["Tables"]["calendar_events"]["Row"]["metadata"],
          })
          .eq("id", existing.calendar_event_id)
          .eq("org_id", workingOrgId);

        if (calendarUpdateErr) {
          logError("ANNOUNCEMENTS update calendar error", calendarUpdateErr);
        }
      } else {
        const { data: calendarEvent, error: calendarErr } = await svc
          .from("calendar_events")
          .insert({
            org_id: workingOrgId,
            unit_id: null,
            title: `Comunicado: ${eventTitle}`,
            description: snippet,
            start_time: sendAtIso,
            end_time: markerEndIso,
            all_day: false,
            color: "#0EA5E9",
            metadata: {
              kind: "announcement",
              announcement_id: announcementId,
              title: payload.title,
            } satisfies Database["public"]["Tables"]["calendar_events"]["Row"]["metadata"],
            created_by: auth.userId,
          })
          .select("id")
          .maybeSingle();

        if (!calendarErr && calendarEvent?.id) {
          await svc
            .from("announcements")
            .update({ calendar_event_id: calendarEvent.id })
            .eq("id", announcementId);
        } else if (calendarErr) {
          logError("ANNOUNCEMENTS create calendar error", calendarErr);
        }
      }
    } else if (existing.calendar_event_id) {
      await removeCalendarEvent(svc, existing.calendar_event_id, workingOrgId);
      await svc
        .from("announcements")
        .update({ calendar_event_id: null })
        .eq("id", announcementId);
    }

    if (willSendNow) {
      const finalRecipients = new Set<string>(userIds);
      finalRecipients.delete(auth.userId);
      const snippet = buildAnnouncementSnippet(payload.content);
      const notificationRows = Array.from(finalRecipients).map((userId) => ({
        org_id: workingOrgId,
        user_id: userId,
        type: "announcement.sent" as const,
        title: payload.title,
        message: snippet,
        body: snippet,
        action_url: "/comunicados",
        metadata: {
          announcement_id: announcementId,
          org_id: workingOrgId,
          title: payload.title,
        },
      }));

      if (notificationRows.length) {
        const { error: notifErr } = await svc
          .from("notifications")
          .insert(notificationRows);

        if (notifErr) {
          logError("ANNOUNCEMENTS notify on update error", notifErr);
          return errorResponse(
            500,
            "db_error",
            "Falha ao notificar destinatários"
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      announcement: {
        id: announcementId,
        status: nextStatus,
        sendAt: nextStatus === "scheduled" ? sendAtIso : null,
        sentAt: sentAtIso,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext<"/api/messages/announcements/[announcementId]">
) {
  try {
    const { announcementId } = await context.params;
    const supabaseUser = createServerClientWithCookies();
    const svc = createServiceClient();
    const auth = await getAuthContext(supabaseUser);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const { data: existing, error: loadErr } = await svc
      .from("announcements")
      .select("id, org_id, author_id, calendar_event_id")
      .eq("id", announcementId)
      .maybeSingle();

    if (
      loadErr ||
      !existing ||
      (!auth.isPlatformAdmin && existing.org_id !== auth.orgId)
    ) {
      return errorResponse(404, "not_found", "Comunicado não encontrado.");
    }

    if (!canManageAnnouncement(auth, existing)) {
      return errorResponse(
        403,
        "forbidden",
        "Apenas o autor, o master da matriz ou o admin global podem removê-lo."
      );
    }

    const workingOrgId = existing.org_id;

    await svc
      .from("announcement_comments")
      .delete()
      .eq("announcement_id", announcementId);
    await svc
      .from("announcement_reactions")
      .delete()
      .eq("announcement_id", announcementId);
    await svc
      .from("announcement_recipients")
      .delete()
      .eq("announcement_id", announcementId);

    await removeCalendarEvent(svc, existing.calendar_event_id, workingOrgId);

    const { error: deleteErr } = await svc
      .from("announcements")
      .delete()
      .eq("id", announcementId)
      .eq("org_id", workingOrgId);

    if (deleteErr) {
      logError("ANNOUNCEMENTS delete error", deleteErr);
      return errorResponse(500, "db_error", "Falha ao remover comunicado");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
