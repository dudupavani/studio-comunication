import { NextRequest, NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";

type Scope = "inbox" | "chats" | "chat";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);
    if (!auth) {
      return NextResponse.json(
        { error: { message: "Sessão inválida." } },
        { status: 401 }
      );
    }

    const payload = (await req.json().catch(() => null)) as
      | { scope?: Scope; chatId?: string }
      | null;

    const scope = payload?.scope;
    const chatId = payload?.chatId?.trim() || null;

    if (!chatId && scope !== "inbox" && scope !== "chats") {
      return NextResponse.json(
        { error: { message: "Escopo inválido" } },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let query = supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", auth.userId)
      .is("read_at", null);

    if (chatId) {
      query = query
        .eq("type", "chat.message")
        .filter("metadata->>chat_id", "eq", chatId);
    } else if (scope === "chats") {
      query = query.eq("type", "chat.message");
    } else {
      query = query.neq("type", "chat.message");
    }

    const { error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = err?.message ?? "Falha ao atualizar notificações";
    return NextResponse.json({ error: { message } }, { status });
  }
}
