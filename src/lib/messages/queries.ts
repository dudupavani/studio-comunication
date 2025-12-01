// src/lib/messages/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  Chat,
  ChatMember,
  ChatMessage,
  ChatMessageMention,
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
      creator: null,
    });
  });

  const baseItems = Array.from(chatsById.values());

  const unreadMap = new Map<string, { count: number; last: string | null }>();
  try {
    const { data: unreadRows, error: unreadError } = await supabase.rpc(
      "get_unread_chat_notifications",
      { p_user_id: userId }
    );
    if (unreadError) {
      console.warn("MESSAGES fetch unread chat notifications error", unreadError);
    }
    (unreadRows ?? []).forEach((row: any) => {
      if (!row?.chat_id) return;
      unreadMap.set(String(row.chat_id), {
        count: Number(row.unread_count ?? 0),
        last: row.last_notification_at ?? null,
      });
    });
  } catch (err) {
    console.warn("MESSAGES fetch unread chat notifications failure", err);
  }

  const creatorIds = Array.from(
    new Set(
      baseItems
        .map((chat) => chat.created_by)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (creatorIds.length) {
    const svc = createServiceClient();
    const { data: identities, error: identityError } = await svc.rpc(
      "get_user_identity_many",
      { p_user_ids: creatorIds }
    );

    if (identityError) {
      console.warn(
        "MESSAGES fetch chat creator identity error",
        identityError
      );
    }

    if (Array.isArray(identities)) {
      const map: Record<string, UserMini> = {};
      identities.forEach((identity: any) => {
        if (!identity?.user_id) return;
        map[identity.user_id] = {
          id: identity.user_id,
          full_name: identity.full_name ?? null,
          avatar_url: identity.avatar_url ?? null,
          email: identity.email ?? null,
        };
      });

      baseItems.forEach((chat) => {
        chat.creator = chat.created_by ? map[chat.created_by] ?? null : null;
      });
    }
  }

  if (baseItems.length) {
    await Promise.all(
      baseItems.map(async (chat) => {
        const unreadInfo = unreadMap.get(chat.id);
        chat.unread_count = unreadInfo?.count ?? 0;
        chat.last_unread_at = unreadInfo?.last ?? null;

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
    const joinProfile = row.profiles ?? null;
    const identity = identityMap[row.user_id];

    const fullName =
      joinProfile?.full_name?.trim() ||
      identity?.full_name?.trim() ||
      identity?.email?.trim() ||
      null;
    const avatarUrl = joinProfile?.avatar_url ?? identity?.avatar_url ?? null;
    const email = identity?.email ?? null;
    const profileId = joinProfile?.id ?? identity?.id ?? row.user_id;

    const hasProfileData = fullName || avatarUrl || email;

    return {
      id: row.id,
      chat_id: row.chat_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      user: hasProfileData
        ? {
            id: profileId,
            full_name: fullName,
            avatar_url: avatarUrl,
            email,
          }
        : null,
    };
  });
}

export async function fetchChatMessages(
  supabase: TypedSupabaseClient,
  chatId: string,
  params: { limit?: number; cursor?: string }
): Promise<
  PaginatedResult<ChatMessage & { sender?: UserMini | null; mentions?: ChatMessageMention[] }>
> {
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
          email: null,
        }
      : null,
  }));

  const senderIdsNeedingIdentity = Array.from(
    new Set(
      items
        .filter(
          (item) =>
            !item.sender ||
            (!item.sender.full_name && !item.sender.avatar_url)
        )
        .map((item) => item.sender_id)
        .filter(Boolean)
    )
  );

  let identityMap: Record<string, UserMini> = {};

  if (senderIdsNeedingIdentity.length) {
    try {
      const svc = createServiceClient();
      const { data: identities, error: identityError } = await svc.rpc(
        "get_user_identity_many",
        { p_user_ids: senderIdsNeedingIdentity }
      );
      if (identityError) {
        console.warn("MESSAGES fetch sender identity error", identityError);
      } else if (Array.isArray(identities)) {
        identityMap = identities.reduce(
          (acc, identity: any) => {
            if (!identity?.user_id) return acc;
            acc[identity.user_id] = {
              id: identity.user_id,
              full_name: identity.full_name ?? null,
              avatar_url: identity.avatar_url ?? null,
              email: identity.email ?? null,
            };
            return acc;
          },
          {} as Record<string, UserMini>
        );
      }
    } catch (err) {
      console.warn("MESSAGES fetch sender identity failure", err);
    }
  }

  const itemsWithSenders = items.map((item) => {
    const identity = identityMap[item.sender_id];
    if (!identity) {
      return item;
    }

    const fullName =
      item.sender?.full_name?.trim() ||
      identity.full_name?.trim() ||
      identity.email?.trim() ||
      null;
    const avatarUrl = item.sender?.avatar_url ?? identity.avatar_url ?? null;
    const email = item.sender?.email ?? identity.email ?? null;

    return {
      ...item,
      sender: {
        id: item.sender?.id ?? identity.id ?? item.sender_id,
        full_name: fullName,
        avatar_url: avatarUrl,
        email,
      },
    };
  });

  const messageIds = items.map((m) => m.id);
  const mentionsByMessage = new Map<number, ChatMessageMention[]>();

  if (messageIds.length) {
    const { data: mentionRows, error: mentionError } = await supabase
      .from("chat_message_mentions")
      .select(
        `id, message_id, type, mentioned_user_id, raw_label,
         profiles:mentioned_user_id (id, full_name, avatar_url)
        `
      )
      .in("message_id", messageIds)
      .order("id", { ascending: true });

    if (mentionError) {
      console.warn("MESSAGES fetch mentions error", mentionError);
    }

    (mentionRows ?? []).forEach((row: any) => {
      const messageKey = Number(row.message_id);
      const mention: ChatMessageMention = {
        id: row.id,
        type: row.type,
        mentioned_user_id: row.mentioned_user_id,
        raw_label: row.raw_label ?? null,
        user: row.profiles
          ? {
              id: row.profiles.id,
              full_name: row.profiles.full_name,
              avatar_url: row.profiles.avatar_url,
            }
          : null,
      };
      const list = mentionsByMessage.get(row.message_id) ?? [];
      list.push(mention);
      mentionsByMessage.set(messageKey, list);
    });
  }

  const itemsWithMentions = items.map((item) => ({
    ...item,
    mentions: mentionsByMessage.get(item.id) ?? [],
  }));

  const tail = itemsRaw[itemsRaw.length - 1];
  const nextCursor = hasNext && tail
    ? encodeCursor({ created_at: tail.created_at, id: String(tail.id) })
    : undefined;

  return { items: itemsWithMentions, nextCursor };
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
