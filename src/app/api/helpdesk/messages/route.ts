import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import { createHelpdeskMessageSchema } from "@/lib/helpdesk/validations";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/helpdesk/api-helpers";

function unique<T>(items: Iterable<T>): T[] {
  return Array.from(new Set(items));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext();
    const supabase = createServerClientWithCookies();

    const body = await req.json().catch(() => null);
    const parsed = createHelpdeskMessageSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return errorResponse(
        400,
        "validation_error",
        parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
      );
    }

    const payload = parsed.data;

    // Resolve destinatários a partir de usuários + grupos
    const userIds = new Set<string>(payload.userIds ?? []);

    if (payload.groupIds.length > 0) {
      const { data: groupMembers, error: membersError } = await supabase
        .from("user_group_members")
        .select("user_id")
        .in("group_id", payload.groupIds)
        .eq("org_id", auth.orgId);

      if (membersError) {
        console.error("HELPDESK load group members error:", membersError);
        return errorResponse(500, "db_error", "Failed to load group members");
      }

      (groupMembers ?? []).forEach((row: any) => {
        if (row?.user_id) userIds.add(row.user_id as string);
      });
    }

    userIds.delete(auth.userId);
    const recipients = unique(userIds);

    if (recipients.length === 0) {
      return errorResponse(400, "validation_error", "Selecione pelo menos um destinatário");
    }

    const allowReplies = payload.allowReplies ?? true;
    const messageContent = payload.message;

    if (payload.mode === "group") {
      const { data: chatRow, error: chatError } = await supabase
        .from("chats")
        .insert({
          org_id: auth.orgId,
          name: payload.title,
          type: "group",
          allow_replies: allowReplies,
          created_by: auth.userId,
        })
        .select("id")
        .maybeSingle();

      if (chatError || !chatRow) {
        console.error("HELPDESK create chat error:", chatError);
        return errorResponse(500, "db_error", "Failed to create chat");
      }

      const chatId = chatRow.id as string;

      const memberRows = unique([auth.userId, ...recipients]).map((userId) => ({
        chat_id: chatId,
        user_id: userId,
        role: userId === auth.userId ? "admin" : "member",
      }));

      if (memberRows.length) {
        const { error: memberError } = await supabase
          .from("chat_members")
          .insert(memberRows);

      if (memberError && memberError.code !== "23505") {
        console.error("HELPDESK add members error:", memberError);
        return errorResponse(
          500,
          "db_error",
          memberError.message ?? "Failed to assign members"
        );
      }
    }

    const { error: messageError } = await supabase.from("chat_messages").insert({
      chat_id: chatId,
        sender_id: auth.userId,
        message: messageContent,
        attachments: null,
      });

    if (messageError) {
      console.error("HELPDESK create message error:", messageError);
      return errorResponse(
        500,
        "db_error",
        messageError.message ?? "Failed to send message"
      );
    }

      return NextResponse.json({ ok: true, mode: "group", chatIds: [chatId] });
    }

    // Modo individual: cria um chat por destinatário
    const chatEntries = recipients.map((userId) => ({
      id: crypto.randomUUID(),
      org_id: auth.orgId,
      name: payload.title,
      type: "direct",
      allow_replies: allowReplies,
      created_by: auth.userId,
      _recipient: userId,
    }));

    if (chatEntries.length === 0) {
      return errorResponse(400, "validation_error", "Lista de destinatários vazia");
    }

    const { error: chatsError } = await supabase
      .from("chats")
      .insert(chatEntries.map(({ _recipient, ...rest }) => rest));

    if (chatsError) {
      console.error("HELPDESK create chats error:", chatsError);
      return errorResponse(
        500,
        "db_error",
        chatsError.message ?? "Failed to create chats"
      );
    }

    const memberRows = chatEntries.flatMap((entry) => [
      {
        chat_id: entry.id,
        user_id: auth.userId,
        role: "admin" as const,
      },
      {
        chat_id: entry.id,
        user_id: entry._recipient,
        role: "member" as const,
      },
    ]);

    for (const chunk of chunkArray(memberRows, 100)) {
      const { error: memberError } = await supabase.from("chat_members").insert(chunk);
      if (memberError && memberError.code !== "23505") {
        console.error("HELPDESK add members error:", memberError);
        return errorResponse(
          500,
          "db_error",
          memberError.message ?? "Failed to assign members"
        );
      }
    }

    const messageRows = chatEntries.map((entry) => ({
      chat_id: entry.id,
      sender_id: auth.userId,
      message: messageContent,
      attachments: null,
    }));

    for (const chunk of chunkArray(messageRows, 100)) {
      const { error: messageError } = await supabase.from("chat_messages").insert(chunk);
      if (messageError) {
        console.error("HELPDESK create broadcast message error:", messageError);
        return errorResponse(
          500,
          "db_error",
          messageError.message ?? "Failed to send message"
        );
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "individual",
      chatIds: chatEntries.map((entry) => entry.id),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
import { TextDecoder } from "util";
