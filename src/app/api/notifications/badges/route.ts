import { NextResponse } from "next/server";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";

export async function GET() {
  try {
    const supabase = createServerClientWithCookies();
    const auth = await getAuthContext(supabase);

    const inboxQuery = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .is("read_at", null)
      .neq("type", "chat.message");

    const unreadChatsQuery = supabase.rpc("get_unread_chat_notifications", {
      p_user_id: auth.userId,
    });

    const [{ count: inboxCount, error: inboxError }, { data: chatRows, error: chatError }] =
      await Promise.all([inboxQuery, unreadChatsQuery]);

    if (inboxError) {
      throw inboxError;
    }
    if (chatError) {
      throw chatError;
    }

    const chatMap = Array.isArray(chatRows)
      ? chatRows.reduce(
          (acc, row: any) => {
            if (!row?.chat_id) return acc;
            acc[row.chat_id as string] = {
              count: Number(row.unread_count ?? 0),
              lastNotificationAt: row.last_notification_at ?? null,
            };
            return acc;
          },
          {} as Record<string, { count: number; lastNotificationAt: string | null }>
        )
      : {};

    const totalChatUnread = Object.values(chatMap).reduce(
      (sum, entry) => sum + entry.count,
      0
    );

    return NextResponse.json({
      inbox: inboxCount ?? 0,
      chats: totalChatUnread,
      chatMap,
    });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = err?.message ?? "Failed to load notifications";
    return NextResponse.json({ error: { message } }, { status });
  }
}
