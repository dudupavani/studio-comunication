import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import { getAnnouncementIfRecipient } from "@/lib/messages/announcement-access";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";

export async function POST(
  _req: NextRequest,
  context: RouteContext<"/api/messages/announcements/[announcementId]/views">
) {
  try {
    const { announcementId } = await context.params;
    const supabaseUser = createServerClientWithCookies();
    const auth = await getAuthContext(supabaseUser);
    const svc = createServiceClient();
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const announcement = await getAnnouncementIfRecipient(
      svc,
      auth,
      announcementId
    );
    if (!announcement) {
      return errorResponse(403, "forbidden", "Sem acesso a este comunicado.");
    }

    const { error } = await svc.from("announcement_views").insert({
      announcement_id: announcementId,
      user_id: auth.userId,
      org_id: announcement.org_id,
    });

    if (error) {
      console.error("ANNOUNCEMENTS view insert error:", error);
      return errorResponse(
        500,
        "db_error",
        "Não foi possível registrar a visualização."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
