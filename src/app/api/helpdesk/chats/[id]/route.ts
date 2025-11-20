import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/helpdesk/api-helpers";
import {
  fetchChatById,
  fetchChatMembers,
  isChatMember,
  type TypedSupabaseClient,
} from "@/lib/helpdesk/queries";

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const chatId = context.params.id;
  if (!chatId) {
    return errorResponse(400, "bad_request", "Chat id is required");
  }

  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    const chat = await fetchChatById(supabase, chatId);
    if (!chat) {
      return errorResponse(404, "not_found", "Chat not found");
    }

    // Usa service client após validar membership para contornar RLS e retornar todos os participantes
    const adminClient = createServiceClient() as unknown as TypedSupabaseClient;
    const members = await fetchChatMembers(adminClient, chatId);

    return NextResponse.json({ chat, members });
  } catch (err) {
    return handleRouteError(err);
  }
}
