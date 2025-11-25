import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  errorResponse,
  handleRouteError,
  parsePagination,
} from "@/lib/messages/api-helpers";
import {
  fetchChatMessages,
  fetchChatMembers,
  isChatMember,
  type TypedSupabaseClient,
} from "@/lib/messages/queries";
import { sendMessageSchema, type SendMessageMentionInput } from "@/lib/messages/validations";

type StoredAttachment = {
  name: string;
  path: string;
  size: number;
  mime: string;
  url?: string | null;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
const SIGNED_URL_TTL = 60 * 60; // 1 hour

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150) || "file";
}

async function signAttachments(
  storage: ReturnType<typeof createServiceClient>["storage"],
  bucket: string,
  attachments: StoredAttachment[]
): Promise<StoredAttachment[]> {
  const withUrls = await Promise.all(
    attachments.map(async (att) => {
      const { data: signed, error } = await storage
        .from(bucket)
        .createSignedUrl(att.path, SIGNED_URL_TTL);
      if (error) {
        console.warn("MESSAGES sign attachment error:", error);
      }
      return { ...att, url: signed?.signedUrl ?? null };
    })
    );
  return withUrls;
}

function parseMentions(raw: unknown): SendMessageMentionInput[] {
  const schema = sendMessageSchema.shape.mentions;
  const parsed = schema.safeParse(raw ?? []);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Menções inválidas"
    );
  }
  return parsed.data ?? [];
}

function normalizeMentions(
  mentions: SendMessageMentionInput[],
  memberIds: Set<string>
): SendMessageMentionInput[] {
  const normalized: SendMessageMentionInput[] = [];
  let hasAll = false;
  const seenUsers = new Set<string>();

  mentions.forEach((mention) => {
    const label = mention.label?.trim() || null;
    if (mention.type === "all") {
      if (hasAll) return;
      hasAll = true;
      normalized.push({ type: "all", label });
      return;
    }

    const userId = mention.userId;
    if (!userId) return;
    if (!memberIds.has(userId)) {
      throw new Error("Menção inválida: usuário não pertence ao chat");
    }
    if (seenUsers.has(userId)) return;
    seenUsers.add(userId);
    normalized.push({ type: "user", userId, label });
  });

  return normalized;
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id: chatId } = await context.params;
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

    const { limit, cursor } = parsePagination(req.nextUrl.searchParams, {
      defaultLimit: 50,
      maxLimit: 200,
    });

    const result = await fetchChatMessages(supabase, chatId, {
      limit,
      cursor,
    });

    const adminClient = createServiceClient() as unknown as TypedSupabaseClient;
    const memberProfiles = await fetchChatMembers(adminClient, chatId);
    const memberMap = new Map(
      memberProfiles.map((member) => [
        member.user_id,
        member.user ? { ...member.user } : null,
      ])
    );

    // Reassina URLs de anexos antes de devolver (mantém bucket privado)
    const adminStorage = createServiceClient().storage;
    const items = await Promise.all(
      result.items.map(async (msg) => {
        const senderInfo = msg.sender_id
          ? memberMap.get(msg.sender_id) ?? null
          : null;
        const mentions = (msg.mentions ?? []).map((mention) => {
          const user =
            mention.mentioned_user_id && memberMap.has(mention.mentioned_user_id)
              ? memberMap.get(mention.mentioned_user_id) ?? null
              : mention.user ?? null;
          return { ...mention, user };
        });
        const base = {
          ...msg,
          sender: senderInfo,
          mentions,
        };

        if (!base.attachments || !Array.isArray(base.attachments)) return base;
        const signed = await signAttachments(
          adminStorage,
          "chat-attachment",
          base.attachments as StoredAttachment[]
        );
        return { ...base, attachments: signed };
      })
    );

    return NextResponse.json({ ...result, items });
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
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);

    const member = await isChatMember(supabase, chatId, auth.userId);
    if (!member) {
      return errorResponse(403, "forbidden", "Access denied to chat");
    }

    const contentType = req.headers.get("content-type") || "";
    const admin = createServiceClient();

    // Suporta multipart/form-data (com anexos) e JSON (legado)
    let messageText = "";
    let files: File[] = [];
    let mentionsInput: SendMessageMentionInput[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      messageText = String(formData.get("message") ?? "").trim();
      files = (formData.getAll("files") || []).filter(
        (f): f is File => typeof f !== "string" && f instanceof File
      );
      const mentionsRaw = formData.get("mentions");
      if (mentionsRaw !== null) {
        if (typeof mentionsRaw !== "string") {
          return errorResponse(
            400,
            "validation_error",
            "Formato de menções inválido"
          );
        }
        try {
          const parsedMentions = JSON.parse(mentionsRaw);
          mentionsInput = parseMentions(parsedMentions);
        } catch (err: any) {
          return errorResponse(
            400,
            "validation_error",
            err?.message ?? "Menções inválidas"
          );
        }
      }
    } else {
      const rawBody = await req.json().catch(() => null);
      const parsed = sendMessageSchema.safeParse(rawBody ?? {});
      if (!parsed.success) {
        return errorResponse(
          400,
          "validation_error",
          parsed.error.issues.map((i) => i.message).join("; ") || "Invalid payload"
        );
      }
      messageText = parsed.data.message;
      files = [];
      mentionsInput = parsed.data.mentions ?? [];
    }

    if (!messageText || messageText.trim().length === 0) {
      return errorResponse(400, "validation_error", "Mensagem obrigatória");
    }

    // Validação dos anexos
    if (files.length > MAX_FILES) {
      return errorResponse(400, "validation_error", "Máximo de 5 arquivos por mensagem");
    }
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return errorResponse(400, "validation_error", "Tamanho total dos arquivos excede 20MB");
    }
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        return errorResponse(400, "validation_error", `Arquivo muito grande: ${f.name}`);
      }
    }

    const adminClient = admin as unknown as TypedSupabaseClient;
    const memberProfiles = await fetchChatMembers(adminClient, chatId);
    const memberIds = new Set(memberProfiles.map((member) => member.user_id));
    const memberMap = new Map(
      memberProfiles.map((member) => [
        member.user_id,
        member.user ? { ...member.user } : null,
      ])
    );

    let normalizedMentions: SendMessageMentionInput[] = [];
    try {
      normalizedMentions = normalizeMentions(mentionsInput, memberIds);
    } catch (err: any) {
      return errorResponse(
        400,
        "validation_error",
        err?.message ?? "Menções inválidas"
      );
    }

    const attachments: StoredAttachment[] = [];
    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const path = `${chatId}/${crypto.randomUUID()}-${safeName}`;
      const { data: uploadData, error: uploadError } = await admin.storage
        .from("chat-attachment")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError || !uploadData) {
        console.error("MESSAGES upload attachment error:", uploadError);
        return errorResponse(500, "storage_error", "Falha ao enviar anexo");
      }
      attachments.push({
        name: file.name,
        path: uploadData.path,
        size: file.size,
        mime: file.type || "application/octet-stream",
      });
    }

    const signedAttachments =
      attachments.length > 0
        ? await signAttachments(admin.storage, "chat-attachment", attachments)
        : null;

    const { data, error } = await supabase
      .rpc(
        "create_chat_message_with_mentions",
        {
          p_chat_id: chatId,
          p_message: messageText,
          p_attachments: signedAttachments,
          p_mentions: normalizedMentions,
        }
      )
      .maybeSingle();

    if (error || !data) {
      console.error("MESSAGES send message error:", error);
      return errorResponse(500, "db_error", "Failed to send message");
    }

    const messageRow = data as Database["public"]["Tables"]["chat_messages"]["Row"];

    const { data: mentionRows, error: mentionError } = await supabase
      .from("chat_message_mentions")
      .select("id, message_id, type, mentioned_user_id, raw_label")
      .eq("message_id", messageRow.id)
      .order("id", { ascending: true });

    if (mentionError) {
      console.warn("MESSAGES fetch mentions for message error:", mentionError);
    }

    const mentions = (mentionRows ?? []).map((row: any) => ({
      id: row.id,
      type: row.type,
      mentioned_user_id: row.mentioned_user_id,
      raw_label: row.raw_label ?? null,
      user: row.mentioned_user_id ? memberMap.get(row.mentioned_user_id) ?? null : null,
    }));

    const response = {
      id: messageRow.id,
      chat_id: messageRow.chat_id,
      sender_id: messageRow.sender_id,
      message: messageRow.message,
      attachments: messageRow.attachments,
      created_at: messageRow.created_at,
      sender: memberMap.get(messageRow.sender_id) ?? null,
      mentions,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
