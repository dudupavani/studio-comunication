import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import { updateNotificationsReadState } from "@/lib/notifications/queries";
import { markReadSchema } from "@/lib/notifications/validations";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    const rawBody = await req.json().catch(() => null);
    const parsed = markReadSchema.safeParse(rawBody ?? {});

    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Payload inválido"
      );
    }

    const payload = parsed.data;
    const ids = payload.all ? null : payload.ids;

    const result = await updateNotificationsReadState(
      supabase,
      auth.userId,
      auth.orgId,
      ids,
      payload.read
    );

    return NextResponse.json({ updated: result.updated, read: payload.read });
  } catch (err) {
    return handleRouteError(err);
  }
}
