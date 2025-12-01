import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { createAnnouncementSchema } from "@/lib/messages/validations";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";

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
    const supabaseUser = createServerClientWithCookies();
    const supabaseSvc = createServiceClient();
    const auth = await getAuthContext(supabaseUser);
    const canManage =
      auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;
    if (!canManage) {
      return errorResponse(403, "forbidden", "Not allowed to create announcements");
    }

    const raw = await req.json().catch(() => null);
    const parsed = createAnnouncementSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
      );
    }

    const payload = parsed.data;
    const userIdSet = new Set<string>(
      (payload.userIds ?? []).filter((id): id is string => !!id)
    );
    const groupIds = Array.from(
      new Set(payload.groupIds ?? []).values()
    ).filter(Boolean);
    const teamIds = Array.from(
      new Set(payload.teamIds ?? []).values()
    ).filter(Boolean);

    if (teamIds.length > 0) {
      const { data: teamMembers, error: teamMembersError } = await supabaseUser
        .from("equipe_members")
        .select("user_id")
        .in("equipe_id", teamIds)
        .eq("org_id", auth.orgId);
      if (teamMembersError) {
        console.error(
          "ANNOUNCEMENTS load team members error:",
          teamMembersError
        );
        return errorResponse(
          500,
          "db_error",
          "Failed to load team members"
        );
      }
      (teamMembers ?? []).forEach((row: any) => {
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

    // 1) cria announcement
    const { data: inserted, error: insertErr } = await supabaseSvc
      .from("announcements")
      .insert({
        org_id: auth.orgId,
        author_id: auth.userId,
        title: payload.title,
        content: payload.content,
        allow_comments: payload.allowComments,
        allow_reactions: payload.allowReactions,
      })
      .select("id, created_at")
      .maybeSingle();

    if (insertErr || !inserted) {
      console.error("ANNOUNCEMENTS insert error:", insertErr);
      return errorResponse(500, "db_error", "Failed to create announcement");
    }

    // 2) recipients (users + groups)
    const rows = [
      ...userIds.map((id) => ({
        announcement_id: inserted.id,
        org_id: auth.orgId,
        user_id: id,
        group_id: null,
      })),
      ...groupIds.map((id) => ({
        announcement_id: inserted.id,
        org_id: auth.orgId,
        user_id: null,
        group_id: id,
      })),
    ];

    if (rows.length > 0) {
      const { error: recipientsErr } = await supabaseSvc
        .from("announcement_recipients")
        .insert(rows);
      if (recipientsErr) {
        console.error("ANNOUNCEMENTS recipients error:", recipientsErr);
        return errorResponse(
          500,
          "db_error",
          "Failed to assign recipients to announcement"
        );
      }
    }

    const finalRecipients = new Set<string>(userIds);

    if (groupIds.length > 0) {
      const { data: groupMembers, error: groupErr } = await supabaseSvc
        .from("user_group_members")
        .select("user_id")
        .in("group_id", groupIds)
        .eq("org_id", auth.orgId);

      if (groupErr) {
        console.error("ANNOUNCEMENTS group members fetch error:", groupErr);
        return errorResponse(500, "db_error", "Failed to load group recipients");
      }

      (groupMembers ?? []).forEach((row: any) => {
        const uid = row?.user_id ? String(row.user_id) : null;
        if (uid) {
          finalRecipients.add(uid);
        }
      });
    }

    finalRecipients.delete(auth.userId);

    const snippet = buildAnnouncementSnippet(payload.content);
    const notificationRows = Array.from(finalRecipients).map((userId) => ({
      org_id: auth.orgId,
      user_id: userId,
      type: "announcement.sent" as const,
      title: payload.title,
      body: snippet,
      action_url: "/comunicados",
      metadata: {
        announcement_id: inserted.id,
        org_id: auth.orgId,
        title: payload.title,
      },
    }));

    if (notificationRows.length) {
      const { error: notifErr } = await supabaseSvc
        .from("notifications")
        .insert(notificationRows);

      if (notifErr) {
        console.error("ANNOUNCEMENTS notifications error:", notifErr);
        return errorResponse(
          500,
          "db_error",
          "Failed to create announcement notifications"
        );
      }
    }

    return NextResponse.json({
      ok: true,
      announcement: {
        id: inserted.id,
        createdAt: inserted.created_at,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
