import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";
import { getAnnouncementIfRecipient } from "@/lib/messages/announcement-access";
import { ANNOUNCEMENT_REACTIONS } from "@/lib/messages/announcement-entities";

const bodySchema = z.object({
  emoji: z.enum(ANNOUNCEMENT_REACTIONS),
});

export async function POST(
  req: NextRequest,
  context: RouteContext<"/api/messages/announcements/[announcementId]/reactions">
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
        parsed.error.issues.map((i) => i.message).join("; ") || "Emoji inválido"
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
    if (!announcement.allow_reactions) {
      return errorResponse(
        400,
        "not_allowed",
        "Este comunicado não permite reações."
      );
    }

    const { data: existing } = await svc
      .from("announcement_reactions")
      .select("announcement_id")
      .eq("announcement_id", announcementId)
      .eq("author_id", auth.userId)
      .eq("emoji", parsed.data.emoji)
      .maybeSingle();

    if (existing) {
      const { error } = await svc
        .from("announcement_reactions")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("author_id", auth.userId)
        .eq("emoji", parsed.data.emoji);
      if (error) {
        console.error("ANNOUNCEMENTS reaction delete error:", error);
        return errorResponse(
          500,
          "db_error",
          "Não foi possível remover a reação."
        );
      }
      return NextResponse.json({ ok: true, removed: true });
    }

    const { error } = await svc.from("announcement_reactions").insert({
      announcement_id: announcementId,
      author_id: auth.userId,
      emoji: parsed.data.emoji,
    });
    if (error) {
      console.error("ANNOUNCEMENTS reaction insert error:", error);
      return errorResponse(
        500,
        "db_error",
        "Não foi possível registrar a reação."
      );
    }

    return NextResponse.json({ ok: true, removed: false });
  } catch (err) {
    return handleRouteError(err);
  }
}
