import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/helpdesk/auth-context";
import {
  errorResponse,
  handleRouteError,
  parsePagination,
} from "@/lib/helpdesk/api-helpers";
import {
  fetchChatMessages,
  isChatMember,
  type TypedSupabaseClient,
} from "@/lib/helpdesk/queries";
import { sendMessageSchema } from "@/lib/helpdesk/validations";

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
        console.warn("HELPDESK sign attachment error:", error);
      }
      return { ...att, url: signed?.signedUrl ?? null };
    })
  );
  return withUrls;
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

    // Reassina URLs de anexos antes de devolver (mantém bucket privado)
    const adminStorage = createServiceClient().storage;
    const items = await Promise.all(
      result.items.map(async (msg) => {
        if (!msg.attachments || !Array.isArray(msg.attachments)) return msg;
        const signed = await signAttachments(
          adminStorage,
          "chat-attachment",
          msg.attachments as StoredAttachment[]
        );
        return { ...msg, attachments: signed };
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

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      messageText = String(formData.get("message") ?? "").trim();
      files = (formData.getAll("files") || []).filter(
        (f): f is File => typeof f !== "string" && f instanceof File
      );
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
        console.error("HELPDESK upload attachment error:", uploadError);
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
      .from("chat_messages")
      .insert({
        chat_id: chatId,
        sender_id: auth.userId,
        message: messageText,
        attachments: signedAttachments,
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
