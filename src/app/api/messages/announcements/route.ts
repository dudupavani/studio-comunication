import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { createAnnouncementSchema } from "@/lib/messages/validations";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";

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
    const userIds = Array.from(new Set(payload.userIds ?? [])).filter(Boolean);
    const groupIds = Array.from(new Set(payload.groupIds ?? [])).filter(Boolean);

    if (userIds.length === 0 && groupIds.length === 0) {
      return errorResponse(
        400,
        "validation_error",
        "Selecione ao menos um destinatário (usuário ou grupo)."
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
