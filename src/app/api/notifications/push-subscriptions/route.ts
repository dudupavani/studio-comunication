import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import { createPushSubscriptionSchema } from "@/lib/notifications/validations";

export async function GET() {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys, created_at")
      .eq("user_id", auth.userId)
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("NOTIFICATIONS push list error:", error);
      return errorResponse(500, "db_error", "Falha ao listar push subscriptions");
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }
    const rawBody = await req.json().catch(() => null);
    const parsed = createPushSubscriptionSchema.safeParse(rawBody ?? {});

    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Payload inválido"
      );
    }

    const payload = parsed.data;

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: auth.userId,
          org_id: auth.orgId,
          endpoint: payload.endpoint,
          keys: payload.keys,
        },
        { onConflict: "user_id,endpoint" }
      )
      .select("id, endpoint, keys, created_at")
      .maybeSingle();

    if (error) {
      console.error("NOTIFICATIONS push create error:", error);
      return errorResponse(500, "db_error", "Falha ao registrar push subscription");
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
