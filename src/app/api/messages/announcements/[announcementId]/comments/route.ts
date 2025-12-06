import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";
import { getAnnouncementIfRecipient } from "@/lib/messages/announcement-access";

const bodySchema = z.object({
  content: z.string().trim().min(1, "Comentário obrigatório").max(2000),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ announcementId: string }> }
) {
  try {
    const { announcementId } = await context.params;
    const supabaseUser = createServerClientWithCookies();
    const auth = await getAuthContext(supabaseUser);
    const svc = createServiceClient();

    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") ||
          "Comentário inválido"
      );
    }

    const announcement = await getAnnouncementIfRecipient(
      svc,
      auth,
      announcementId
    );
    if (!announcement) {
      return errorResponse(403, "forbidden", "Sem acesso a este comunicado.");
    }
    if (!announcement.allow_comments) {
      return errorResponse(
        400,
        "not_allowed",
        "Este comunicado não permite comentários."
      );
    }

    const { error } = await svc.from("announcement_comments").insert({
      announcement_id: announcementId,
      author_id: auth.userId,
      content: parsed.data.content,
    });

    if (error) {
      console.error("ANNOUNCEMENTS comment insert error:", error);
      return errorResponse(
        500,
        "db_error",
        "Não foi possível salvar o comentário."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
