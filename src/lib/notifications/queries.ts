import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { NotificationType, NotificationRow } from "./types";

type TypedClient = SupabaseClient<Database>;

export type ListNotificationsParams = {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  types?: NotificationType[];
};

export type NotificationListResult = {
  items: NotificationRow[];
  nextCursor?: string;
};

export function encodeCursor(row: { created_at: string; id: string }) {
  return `${row.created_at}__${row.id}`;
}

export function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [created_at, id] = cursor.split("__");
  if (!created_at || !id) return null;
  return { created_at, id };
}

export async function listNotifications(
  client: TypedClient,
  userId: string,
  orgId: string,
  params: ListNotificationsParams = {}
): Promise<NotificationListResult> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const cursor = decodeCursor(params.cursor);

  let query = client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (params.unreadOnly) {
    query = query.is("read_at", null);
  }

  if (params.types && params.types.length > 0) {
    query = query.in("type", params.types);
  }

  if (cursor) {
    query = query.lt("created_at", cursor.created_at);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const tail = hasNext ? rows[rows.length - 1] : items[items.length - 1];

  return {
    items,
    nextCursor: tail ? encodeCursor({ created_at: tail.created_at, id: tail.id }) : undefined,
  };
}

export async function countUnreadNotifications(
  client: TypedClient,
  userId: string,
  orgId: string
) {
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function updateNotificationsReadState(
  client: TypedClient,
  userId: string,
  orgId: string,
  ids: string[] | null,
  read: boolean
) {
  const timestamp = read ? new Date().toISOString() : null;

  let query = client
    .from("notifications")
    .update({ read_at: timestamp })
    .eq("user_id", userId)
    .eq("org_id", orgId);

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");
  if (error) {
    throw error;
  }

  return { updated: (data ?? []).length };
}
