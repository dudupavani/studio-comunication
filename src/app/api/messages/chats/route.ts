import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";
import { fetchChats } from "@/lib/messages/queries";
import {
  errorResponse,
  handleRouteError,
  parsePagination,
} from "@/lib/messages/api-helpers";
import { createChatSchema } from "@/lib/messages/validations";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    const { limit, cursor } = parsePagination(req.nextUrl.searchParams, {
      defaultLimit: 30,
      maxLimit: 100,
    });
    const typeParam = req.nextUrl.searchParams.get("type");
    const normalizedType =
      typeParam && ["direct", "group", "broadcast"].includes(typeParam)
        ? (typeParam as "direct" | "group" | "broadcast")
        : undefined;

    const result = await fetchChats(supabase, auth.userId, auth.orgId, {
      limit,
      cursor,
      type: normalizedType,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    const canCreateChat =
      auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;
    if (!canCreateChat) {
      return errorResponse(403, "forbidden", "Not allowed to create chats");
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = createChatSchema.safeParse(rawBody ?? {});

    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
      );
    }

    const payload = parsed.data;
    if (payload.type !== "direct" && !payload.name) {
      return errorResponse(400, "validation_error", "Nome obrigatório");
    }

    const { data: chatRow, error: chatError } = await supabase
      .from("chats")
      .insert({
        org_id: auth.orgId,
        name: payload.name,
        type: payload.type,
        allow_replies: payload.allow_replies,
        created_by: auth.userId,
      })
      .select("id")
      .maybeSingle();

    if (chatError || !chatRow) {
      console.error("MESSAGES create chat error:", chatError);
      return errorResponse(500, "db_error", "Failed to create chat");
    }

    const chatId = chatRow.id as string;

    const memberIds = new Set(payload.memberIds ?? []);
    memberIds.delete(auth.userId);

    const membersPayload = [
      {
        chat_id: chatId,
        user_id: auth.userId,
        role: "admin" as const,
      },
      ...Array.from(memberIds).map((userId) => ({
        chat_id: chatId,
        user_id: userId,
        role: "member" as const,
      })),
    ];

    if (membersPayload.length > 0) {
      const { error: membersError } = await supabase
        .from("chat_members")
        .insert(membersPayload);

      if (membersError && membersError.code !== "23505") {
        console.error("MESSAGES create members error:", membersError);
        return errorResponse(500, "db_error", "Failed to assign members");
      }
    }

    return NextResponse.json({ id: chatId }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
