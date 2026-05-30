import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { createMessagesPayloadSchema } from "@/lib/messages/validations";
import {
  errorResponse,
  handleRouteError,
} from "@/lib/messages/api-helpers";
import { publishNotificationEvent } from "@/lib/notifications";
import { logError } from "@/lib/log";

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

async function validateRecipientsInOrg(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  recipientIds: string[]
) {
  if (recipientIds.length === 0) return { ok: true as const };

  const { data, error } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .in("user_id", recipientIds);

  if (error) {
    return { ok: false as const, status: 500, message: "Failed to validate recipients" };
  }

  const validIds = new Set((data ?? []).map((row) => row.user_id));
  const invalidIds = recipientIds.filter((userId) => !validIds.has(userId));
  if (invalidIds.length > 0) {
    return { ok: false as const, status: 403, message: "Invalid recipient scope" };
  }

  return { ok: true as const };
}

function normalizeCreatedMessageId(data: unknown, fallback: string) {
  if (typeof data === "number" || typeof data === "string") return data;
  if (data && typeof data === "object") {
    const row = data as { id?: number | string; message_id?: number | string };
    return row.id ?? row.message_id ?? fallback;
  }
  return fallback;
}

async function createChatMessageWithMentions(
  supabase: ReturnType<typeof createServiceClient>,
  args: {
    chatId: string;
    senderId: string;
    message: string;
  }
) {
  const { data, error } = await supabase.rpc("create_chat_message_with_mentions", {
    p_chat_id: args.chatId,
    p_sender_id: args.senderId,
    p_message: args.message,
    p_attachments: null,
    p_mentions: [],
  });

  return {
    data: normalizeCreatedMessageId(data, args.chatId),
    error,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createServerClientWithCookies();
    const auth = await getAuthContext(supabaseUser);
    if (!auth) {
      return errorResponse(401, "unauthorized", "Sessão inválida.");
    }
    const canManageMessages =
      auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;
    if (!canManageMessages) {
      return errorResponse(403, "forbidden", "Not allowed to send messages");
    }
    const supabaseWriter =
      auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster
        ? createServiceClient()
        : supabaseUser;

    const body = await req.json().catch(() => null);
    const parsed = createMessagesPayloadSchema.safeParse(body ?? {});
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
      const { data: groupMembers, error: membersError } = await supabaseUser
        .from("user_group_members")
        .select("user_id")
        .in("group_id", payload.groupIds)
        .eq("org_id", auth.orgId);

      if (membersError) {
        console.error("MESSAGES load group members error:", membersError);
        return errorResponse(500, "db_error", "Failed to load group members");
      }

      (groupMembers ?? []).forEach((row: any) => {
        if (row?.user_id) userIds.add(row.user_id as string);
      });
    }

    if (payload.teamIds.length > 0) {
      const { data: teamMembers, error: teamMembersError } = await supabaseUser
        .from("equipe_members")
        .select("user_id")
        .in("equipe_id", payload.teamIds)
        .eq("org_id", auth.orgId);

      if (teamMembersError) {
        console.error("MESSAGES load team members error:", teamMembersError);
        return errorResponse(500, "db_error", "Failed to load team members");
      }

      (teamMembers ?? []).forEach((row: any) => {
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
    const scopeCheck = await validateRecipientsInOrg(
      createServiceClient(),
      auth.orgId,
      recipients
    );
    if (!scopeCheck.ok) {
      return errorResponse(scopeCheck.status, "invalid_recipient_scope", scopeCheck.message);
    }

    if (payload.mode === "group") {
      const { data: chatRow, error: chatError } = await supabaseWriter
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
        console.error("MESSAGES create chat error:", chatError);
        return errorResponse(500, "db_error", "Failed to create chat");
      }

      const chatId = chatRow.id as string;

      const memberRows = unique([auth.userId, ...recipients]).map((userId) => ({
        chat_id: chatId,
        user_id: userId,
        role: (userId === auth.userId ? "admin" : "member") as "admin" | "member",
      }));

      if (memberRows.length) {
        const { error: memberError } = await supabaseWriter
          .from("chat_members")
          .insert(memberRows);

        if (memberError && memberError.code !== "23505") {
          console.error("MESSAGES add members error:", memberError);
          return errorResponse(
            500,
            "db_error",
            memberError.message ?? "Failed to assign members"
          );
        }
      }

      const { data: messageId, error: messageError } =
        await createChatMessageWithMentions(supabaseWriter, {
          chatId,
          senderId: auth.userId,
          message: messageContent,
        });

      if (messageError) {
        console.error("MESSAGES create message error:", messageError);
        return errorResponse(
          500,
          "db_error",
          messageError.message ?? "Failed to send message"
        );
      }

      await publishNotificationEvent({
        eventType: "chat.message_received",
        orgId: auth.orgId,
        actorId: auth.userId,
        actorName: null,
        targetUserIds: recipients,
        payload: {
          chatId,
          chatName: payload.title,
          messageId,
          preview: messageContent,
        },
      }).catch((err) => logError("NOTIFICATIONS chat create group", err));

      return NextResponse.json({ ok: true, mode: "group", chatIds: [chatId] });
    }

    // Modo individual: cria um chat por destinatário
    const chatEntries = recipients.map((userId) => ({
      id: crypto.randomUUID(),
      org_id: auth.orgId,
      name: payload.title,
      type: "direct" as const,
      allow_replies: allowReplies,
      created_by: auth.userId,
      _recipient: userId,
    }));

    if (chatEntries.length === 0) {
      return errorResponse(400, "validation_error", "Lista de destinatários vazia");
    }

    const { error: chatsError } = await supabaseWriter
      .from("chats")
      .insert(chatEntries.map(({ _recipient, ...rest }) => rest));

    if (chatsError) {
      console.error("MESSAGES create chats error:", chatsError);
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
      const { error: memberError } = await supabaseWriter.from("chat_members").insert(chunk);
      if (memberError && memberError.code !== "23505") {
        console.error("MESSAGES add members error:", memberError);
        return errorResponse(
          500,
          "db_error",
          memberError.message ?? "Failed to assign members"
        );
      }
    }

    const messageIdByChat = new Map<string, number | string>();

    for (const entry of chatEntries) {
      const { data: messageId, error: messageError } =
        await createChatMessageWithMentions(supabaseWriter, {
          chatId: entry.id,
          senderId: auth.userId,
          message: messageContent,
        });
      if (messageError) {
        console.error("MESSAGES create broadcast message error:", messageError);
        return errorResponse(
          500,
          "db_error",
          messageError.message ?? "Failed to send message"
        );
      }
      messageIdByChat.set(entry.id, messageId);
    }

    const notificationPromises = chatEntries.map((entry) =>
      publishNotificationEvent({
        eventType: "chat.message_received",
        orgId: auth.orgId,
        actorId: auth.userId,
        actorName: null,
        targetUserIds: [entry._recipient],
        payload: {
          chatId: entry.id,
          chatName: payload.title,
          messageId: messageIdByChat.get(entry.id) ?? entry.id,
          preview: messageContent,
        },
      }).catch((err) => logError("NOTIFICATIONS chat create individual", err))
    );

    await Promise.all(notificationPromises);

    return NextResponse.json({
      ok: true,
      mode: "individual",
      chatIds: chatEntries.map((entry) => entry.id),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
