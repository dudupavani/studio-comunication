import { NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";

export async function DELETE(
  _req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!id) {
      return errorResponse(400, "validation_error", "ID obrigatório");
    }

    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .eq("org_id", auth.orgId);

    if (error) {
      console.error("NOTIFICATIONS push delete error:", error);
      return errorResponse(500, "db_error", "Falha ao remover inscrição");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
