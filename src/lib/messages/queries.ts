// src/lib/messages/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  Chat,
  ChatMember,
  ChatMessage,
  ChatSummary,
  PaginatedResult,
  UserMini,
} from "./types";

export type TypedSupabaseClient = SupabaseClient<Database>;

export function encodeCursor(row: { created_at: string; id: string }) {
  return `${row.created_at}__${row.id}`;
}

export function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [created_at, id] = cursor.split("__");
  if (!created_at || !id) return null;
  return { created_at, id };
}

export async function fetchChats(
  supabase: TypedSupabaseClient,
  userId: string,
  orgId: string,
  params: { limit?: number; cursor?: string; type?: "direct" | "group" | "broadcast" } = {}
): Promise<PaginatedResult<ChatSummary>> {
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
  const cursorInput = decodeCursor(params.cursor);

  let membershipQuery = supabase
    .from("chat_members")
    .select("chat_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(limit + 1);

  if (cursorInput) {
    membershipQuery = membershipQuery.lt("joined_at", cursorInput.created_at);
  }

  const { data: membershipRows, error: membershipError } = await membershipQuery;
  if (membershipError) {
    throw new Error(`Failed to fetch chats: ${membershipError.message}`);
  }

  const memberships = Array.isArray(membershipRows) ? membershipRows : [];
  const hasNext = memberships.length > limit;
  const slice = hasNext ? memberships.slice(0, limit) : memberships;

  const chatIds = slice.map((row: any) => row.chat_id).filter(Boolean);
  if (chatIds.length === 0) {
    return { items: [], nextCursor: undefined };
  }

  let chatQuery = supabase
    .from("chats")
    .select(
      "id, org_id, name, type, allow_replies, created_by, created_at"
    )
    .in("id", chatIds);

  if (params.type) {
    chatQuery = chatQuery.eq("type", params.type);
  }

  const { data: chatRows, error: chatsError } = await chatQuery;

  if (chatsError) {
    throw new Error(`Failed to load chats: ${chatsError.message}`);
  }

  const chatsById = new Map<string, ChatSummary>();
  (chatRows ?? []).forEach((row: any) => {
    if (row.org_id !== orgId) return;
    chatsById.set(String(row.id), {
      id: String(row.id),
      org_id: row.org_id,
      name: row.name,
      type: row.type,
      allow_replies: row.allow_replies,
      created_by: row.created_by,
      created_at: row.created_at,
      last_message: null,
    });
  });

  const baseItems = Array.from(chatsById.values());

  if (baseItems.length) {
    await Promise.all(
      baseItems.map(async (chat) => {
        const { data: last, error: lastError } = await supabase
          .from("chat_messages")
          .select("id, message, created_at, sender_id")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastError) {
          console.warn("MESSAGES fetch last message error", lastError);
          return;
        }

        if (last) {
          chat.last_message = {
            id: last.id,
            message: last.message,
            created_at: last.created_at,
            sender_id: last.sender_id,
          };
        }
      })
    );
  }

  const items = baseItems.sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  const nextRow = hasNext ? memberships[limit] : undefined;
  const nextCursor = nextRow
    ? encodeCursor({
        created_at: nextRow.joined_at,
        id: String(nextRow.chat_id),
      })
    : undefined;

  return {
    items,
    nextCursor,
  };
}

export async function fetchChatById(
  supabase: TypedSupabaseClient,
  chatId: string
): Promise<Chat | null> {
  const { data, error } = await supabase
    .from("chats")
    .select("id, org_id, name, type, allow_replies, created_by, created_at")
    .eq("id", chatId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return (data as Chat) ?? null;
}

export async function fetchChatMembers(
  supabase: TypedSupabaseClient,
  chatId: string
): Promise<Array<ChatMember & { user: UserMini | null }>> {
  const { data, error } = await supabase
    .from("chat_members")
    .select(
      `id, chat_id, user_id, role, joined_at,
       profiles:user_id (id, full_name, avatar_url)
      `
    )
    .eq("chat_id", chatId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];

  // Busca identidades de usuários para garantir full_name (usa função SQL que já resolve nomes)
  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));

  const identityMap: Record<
    string,
    { id: string; full_name: string | null; avatar_url: string | null; email?: string | null }
  > = {};

  if (userIds.length) {
    const svc = createServiceClient();
    const { data: identities, error: identitiesError } = await svc.rpc(
      "get_user_identity_many",
      { p_user_ids: userIds }
    );

    if (identitiesError) {
      console.warn("MESSAGES fetch identity fallback error", identitiesError);
    }

    if (Array.isArray(identities)) {
      identities.forEach((identity: any) => {
        identityMap[identity.user_id] = {
          id: identity.user_id,
          full_name: identity.full_name ?? null,
          avatar_url: identity.avatar_url ?? null,
          email: identity.email ?? null,
        };
      });
    }
  }

  return rows.map((row: any) => {
    const profileFromJoin =
      row.profiles && (row.profiles.full_name || row.profiles.avatar_url)
        ? row.profiles
        : null;
    const identity = identityMap[row.user_id];
    const profile = profileFromJoin || identity;

    return {
      id: row.id,
      chat_id: row.chat_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      user: profile
        ? {
            id: profile.id ?? row.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            email: (profile as any).email ?? null,
          }
        : null,
    };
  });
}

export async function fetchChatMessages(
  supabase: TypedSupabaseClient,
  chatId: string,
  params: { limit?: number; cursor?: string }
): Promise<PaginatedResult<ChatMessage & { sender?: UserMini | null }>> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const cursor = decodeCursor(params.cursor);

  let query = supabase
    .from("chat_messages")
    .select(
      `id, chat_id, sender_id, message, attachments, created_at,
       profiles:sender_id (id, full_name, avatar_url)
      `
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor.created_at);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  const hasNext = rows.length > limit;
  const itemsRaw = hasNext ? rows.slice(0, limit) : rows;

  const items = itemsRaw.map((row: any) => ({
    id: row.id,
    chat_id: String(row.chat_id),
    sender_id: row.sender_id,
    message: row.message,
    attachments: row.attachments,
    created_at: row.created_at,
    sender: row.profiles
      ? {
          id: row.profiles.id,
          full_name: row.profiles.full_name,
          avatar_url: row.profiles.avatar_url,
        }
      : null,
  }));

  const tail = itemsRaw[itemsRaw.length - 1];
  const nextCursor = hasNext && tail
    ? encodeCursor({ created_at: tail.created_at, id: String(tail.id) })
    : undefined;

  return { items, nextCursor };
}

export async function isChatAdmin(
  supabase: TypedSupabaseClient,
  chatId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("chat_members")
    .select("role")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to verify chat admin: ${error.message}`);
  }

  const role = data?.role as string | undefined;
  return role === "admin";
}

export async function isChatMember(
  supabase: TypedSupabaseClient,
  chatId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("chat_members")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to verify membership: ${error.message}`);
  }

  return !!data;
}
