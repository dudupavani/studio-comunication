import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";
import { errorResponse, handleRouteError } from "@/lib/messages/api-helpers";
import { isChatMember } from "@/lib/messages/queries";

type StoredAttachment = {
  name: string;
  path: string;
  size: number;
  mime: string;
  url?: string | null;
  message_id?: number;
  created_at?: string;
};

const SIGNED_URL_TTL = 60 * 60; // 1h
const BUCKET = "chat-attachment";

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

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, attachments, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MESSAGES list attachments error:", error);
      return errorResponse(500, "db_error", "Failed to load attachments");
    }

    const rows = Array.isArray(data) ? data : [];
    const flat: StoredAttachment[] = [];
    for (const row of rows) {
      if (!row.attachments || !Array.isArray(row.attachments)) continue;
      for (const att of row.attachments as StoredAttachment[]) {
        flat.push({
          ...att,
          message_id: row.id,
          created_at: row.created_at,
        });
      }
    }

    const adminStorage = createServiceClient().storage;
    const signed = await Promise.all(
      flat.map(async (att) => {
        const { data: signedUrl, error: signErr } = await adminStorage
          .from(BUCKET)
          .createSignedUrl(att.path, SIGNED_URL_TTL);
        if (signErr) {
          console.warn("MESSAGES sign attachment error:", signErr);
        }
        return { ...att, url: signedUrl?.signedUrl ?? att.url ?? null };
      })
    );

    return NextResponse.json({ attachments: signed });
  } catch (err) {
    return handleRouteError(err);
  }
}
