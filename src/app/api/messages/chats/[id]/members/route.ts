import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import { addMemberSchema, removeMemberSchema } from "@/lib/messages/validations";
import {
  fetchChatMembers,
  isChatAdmin,
  isChatMember,
  type TypedSupabaseClient,
} from "@/lib/messages/queries";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveChatId(context: RouteContext) {
  const params = await context.params;
  return params?.id;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const chatId = await resolveChatId(context);
  if (!chatId) {
    return errorResponse(400, "bad_request", "Chat id is required");
  }

  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    // Usa service client após validar membership para contornar RLS e retornar todos os participantes
    const adminClient = createServiceClient() as unknown as TypedSupabaseClient;
    const members = await fetchChatMembers(adminClient, chatId);
    return NextResponse.json({ members });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const chatId = await resolveChatId(context);
  if (!chatId) {
    return errorResponse(400, "bad_request", "Chat id is required");
  }

  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    const isAdmin = auth.isPlatformAdmin || (await isChatAdmin(supabase, chatId, auth.userId));
    if (!isAdmin) {
      return errorResponse(403, "forbidden", "Only chat admins can add members");
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = addMemberSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
      );
    }

    const payload = parsed.data;

    const { data: existing, error: existingError } = await supabase
      .from("chat_members")
      .select("id")
      .eq("chat_id", chatId)
      .eq("user_id", payload.userId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("MESSAGES fetch member error:", existingError);
      return errorResponse(500, "db_error", "Failed to verify member");
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("chat_members")
        .update({ role: payload.role })
        .eq("chat_id", chatId)
        .eq("user_id", payload.userId);

      if (updateError) {
        console.error("MESSAGES update member error:", updateError);
        return errorResponse(500, "db_error", "Failed to update member");
      }
    } else {
      const { error: insertError } = await supabase
        .from("chat_members")
        .insert({
          chat_id: chatId,
          user_id: payload.userId,
          role: payload.role,
        });

      if (insertError && insertError.code !== "23505") {
        console.error("MESSAGES add member error:", insertError);
        return errorResponse(500, "db_error", "Failed to add member");
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const chatId = await resolveChatId(context);
  if (!chatId) {
    return errorResponse(400, "bad_request", "Chat id is required");
  }

  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    const isAdmin =
      auth.isPlatformAdmin || (await isChatAdmin(supabase, chatId, auth.userId));
    if (!isAdmin) {
      return errorResponse(
        403,
        "forbidden",
        "Only chat admins can remove members"
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = removeMemberSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
      );
    }

    const payload = parsed.data;

    const { error: deleteError } = await supabase
      .from("chat_members")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", payload.userId);

    if (deleteError && deleteError.code !== "PGRST116") {
      console.error("MESSAGES remove member error:", deleteError);
      return errorResponse(500, "db_error", "Failed to remove member");
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}
