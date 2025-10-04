import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import {
  errorResponse,
  handleRouteError,
  parsePagination,
} from "@/lib/helpdesk/api-helpers";
import {
  fetchChatMessages,
  isChatMember,
} from "@/lib/helpdesk/queries";
import { sendMessageSchema } from "@/lib/helpdesk/validations";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id: chatId } = await context.params;
  if (!chatId) {
    return errorResponse(400, "bad_request", "Chat id is required");
  }

  try {
    const auth = await getAuthContext();
    const supabase = createServerClientWithCookies();

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    const { limit, cursor } = parsePagination(req.nextUrl.searchParams, {
      defaultLimit: 50,
      maxLimit: 200,
    });

    const result = await fetchChatMessages(supabase, chatId, {
      limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id: chatId } = await context.params;
  if (!chatId) {
    return errorResponse(400, "bad_request", "Chat id is required");
  }

  try {
    const auth = await getAuthContext();
    const supabase = createServerClientWithCookies();

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = sendMessageSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
      );
    }

    const payload = parsed.data;

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: chatId,
        sender_id: auth.userId,
        message: payload.message,
        attachments: payload.attachments ?? null,
      })
      .select(
        `id, chat_id, sender_id, message, attachments, created_at,
         profiles:sender_id (id, full_name, avatar_url)
        `
      )
      .maybeSingle();

    if (error || !data) {
      console.error("HELPDESK send message error:", error);
      return errorResponse(500, "db_error", "Failed to send message");
    }

    const response = {
      id: data.id,
      chat_id: data.chat_id,
      sender_id: data.sender_id,
      message: data.message,
      attachments: data.attachments,
      created_at: data.created_at,
      sender: data.profiles
        ? {
            id: data.profiles.id,
            full_name: data.profiles.full_name,
            avatar_url: data.profiles.avatar_url,
          }
        : null,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
