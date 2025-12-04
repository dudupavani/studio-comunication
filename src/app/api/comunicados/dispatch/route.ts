import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";
import type { NotificationInsert } from "@/lib/notifications/types";
import type { Database } from "@/lib/supabase/types";

const CRON_SECRET = process.env.CRON_SECRET;

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

export async function POST(req: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return errorResponse(
        500,
        "config_error",
        "CRON_SECRET não configurado no ambiente"
      );
    }
    const secret = req.headers.get("x-cron-secret");
    if (secret !== CRON_SECRET) {
      return errorResponse(401, "unauthorized", "Invalid cron secret");
    }

    const svc = createServiceClient();
    const nowIso = new Date().toISOString();

    // 1) Buscar agendados vencidos
    const { data: pending, error: pendingErr } = await svc
      .from("announcements")
      .select(
        "id, org_id, author_id, title, content, allow_comments, allow_reactions, send_at"
      )
      .eq("status", "scheduled")
      .lte("send_at", nowIso)
      .limit(100);

    if (pendingErr) {
      return errorResponse(
        500,
        "db_error",
        `Falha ao carregar comunicados agendados: ${pendingErr.message}`
      );
    }

    if (!pending?.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const announcementIds = pending.map((row: any) => row.id as string);

    // 2) Recipients de cada comunicado
    const { data: recipients, error: recErr } = await svc
      .from("announcement_recipients")
      .select("announcement_id, user_id, group_id")
      .in("announcement_id", announcementIds);

    if (recErr) {
      return errorResponse(
        500,
        "db_error",
        `Falha ao carregar destinatários: ${recErr.message}`
      );
    }

    const byAnnouncement = new Map<
      string,
      { users: Set<string>; groups: Set<string> }
    >();
    announcementIds.forEach((id) =>
      byAnnouncement.set(id, { users: new Set(), groups: new Set() })
    );

    (recipients ?? []).forEach((row: any) => {
      const annId = row.announcement_id as string;
      const entry = byAnnouncement.get(annId);
      if (!entry) return;
      if (row.user_id) entry.users.add(row.user_id as string);
      if (row.group_id) entry.groups.add(row.group_id as string);
    });

    // 3) Expansão de grupos
    const groupIds = Array.from(
      new Set(
        (recipients ?? [])
          .map((row: any) => row.group_id as string | null)
          .filter(Boolean) as string[]
      )
    );

    const groupMembersMap = new Map<string, string[]>();
    if (groupIds.length) {
      const { data: groupMembers, error: gmErr } = await svc
        .from("user_group_members")
        .select("group_id, user_id")
        .in("group_id", groupIds);
      if (gmErr) {
        return errorResponse(
          500,
          "db_error",
          `Falha ao carregar membros de grupos: ${gmErr.message}`
        );
      }
      (groupMembers ?? []).forEach((row: any) => {
        const gid = row.group_id as string;
        const uid = row.user_id as string;
        if (!gid || !uid) return;
        const list = groupMembersMap.get(gid) ?? [];
        list.push(uid);
        groupMembersMap.set(gid, list);
      });
    }

    // 4) Monta payloads de notificações
    const notificationRows: NotificationInsert[] = [];
    const markSentIds: string[] = [];

    pending.forEach((row: any) => {
      const annId = row.id as string;
      const entry = byAnnouncement.get(annId);
      if (!entry) return;
      const recipientsSet = new Set<string>(entry.users);
      entry.groups.forEach((gid) => {
        (groupMembersMap.get(gid) ?? []).forEach((uid) =>
          recipientsSet.add(uid)
        );
      });
      // remove autor
      recipientsSet.delete(row.author_id as string);
      if (!recipientsSet.size) {
        markSentIds.push(annId);
        return;
      }
      const snippet = buildAnnouncementSnippet(row.content as string);
      const title = `Novo comunicado: ${row.title as string}`;
      Array.from(recipientsSet).forEach((userId) => {
        notificationRows.push({
          org_id: row.org_id as string,
          user_id: userId,
          type: "announcement.sent",
          title,
          body: snippet,
          action_url: "/comunicados",
          metadata: {
            announcement_id: annId,
            actor_id: row.author_id as string,
            org_id: row.org_id as string,
            title: row.title as string,
          } satisfies Database["public"]["Tables"]["notifications"]["Insert"]["metadata"],
          read_at: null,
        });
      });
      markSentIds.push(annId);
    });

    // 5) Grava notificações
    if (notificationRows.length) {
      const { error: notifErr } = await svc
        .from("notifications")
        .insert(notificationRows);
      if (notifErr) {
        return errorResponse(
          500,
          "db_error",
          `Falha ao criar notificações: ${notifErr.message}`
        );
      }
    }

    // 6) Marca como enviados
    if (markSentIds.length) {
      const { error: updateErr } = await svc
        .from("announcements")
        .update({ status: "sent", sent_at: nowIso })
        .in("id", markSentIds)
        .eq("status", "scheduled");

      if (updateErr) {
        return errorResponse(
          500,
          "db_error",
          `Falha ao atualizar status: ${updateErr.message}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      processed: pending.length,
      notified: notificationRows.length,
      marked: markSentIds.length,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
