import { createServerClientReadOnly } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";
import type { AuthContext } from "@/lib/messages/auth-context";
import { fetchChats } from "./queries";
import type { ChatSummary } from "./types";
import {
  canManageAnnouncement,
  getAnnouncementViewAccess,
} from "./announcement-access";
import {
  ANNOUNCEMENT_REACTIONS,
  type AnnouncementComment,
  type AnnouncementReactionSummary,
  type AnnouncementItem,
} from "./announcement-entities";

export type InboxItem =
  | {
      kind: "conversation";
      chatId: string;
      title: string;
      senderName: string | null;
      senderId: string | null;
      senderAvatar: string | null;
      preview: string | null;
      createdAt: string;
    }
  | (AnnouncementItem & { kind: "announcement" })
  | {
      kind: "calendar_event";
      eventId: string;
      title: string;
      senderId: string | null;
      senderName: string | null;
      senderAvatar: string | null;
      description: string | null;
      startsAt: string;
      endsAt: string;
      allDay: boolean;
      color: string | null;
      unitId: string | null;
      createdAt: string;
    };

type AnnouncementRow = Pick<
  Database["public"]["Tables"]["announcements"]["Row"],
  | "id"
  | "author_id"
  | "title"
  | "content"
  | "allow_comments"
  | "allow_reactions"
  | "created_at"
  | "status"
  | "send_at"
  | "sent_at"
  | "media_kind"
  | "media_url"
  | "media_thumbnail_url"
>;

const ANNOUNCEMENT_SELECT_FIELDS =
  "id,author_id,title,content,allow_comments,allow_reactions,created_at,status,send_at,sent_at,media_kind,media_url,media_thumbnail_url" as const;

function toPlain(text: string | null | undefined) {
  if (!text) return null;
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length ? plain : null;
}

function toAnnouncementMedia(row: AnnouncementRow): AnnouncementItem["media"] {
  if (!row.media_url) {
    return null;
  }

  return {
    kind: row.media_kind === "video" ? "video" : "image",
    url: row.media_url,
    thumbnailUrl: row.media_thumbnail_url ?? null,
  };
}

function getAnnouncementPublishedAt(row: AnnouncementRow) {
  return row.status === "sent" ? row.sent_at ?? row.created_at : null;
}

function getAnnouncementTimelineTimestamp(item: AnnouncementItem) {
  const reference =
    item.publishedAt ??
    (item.status === "scheduled" ? item.sendAt : item.sentAt) ??
    item.createdAt;
  const timestamp = reference ? new Date(reference).getTime() : NaN;
  return Number.isNaN(timestamp) ? new Date(item.createdAt).getTime() : timestamp;
}

function sortAnnouncementItems(items: AnnouncementItem[]) {
  return [...items].sort(
    (a, b) =>
      getAnnouncementTimelineTimestamp(b) -
      getAnnouncementTimelineTimestamp(a)
  );
}

function mapAnnouncementRows(
  rows: AnnouncementRow[],
  authorMap: Awaited<ReturnType<typeof resolveSenderNames>>,
  includeDetails: boolean
): AnnouncementItem[] {
  return rows.map((row) => ({
    announcementId: row.id,
    title: row.title,
    senderId: row.author_id,
    senderName:
      authorMap[row.author_id]?.full_name ||
      authorMap[row.author_id]?.email ||
      null,
    senderAvatar: authorMap[row.author_id]?.avatar_url ?? null,
    senderTitle: authorMap[row.author_id]?.title ?? null,
    createdAt: row.created_at,
    publishedAt: getAnnouncementPublishedAt(row),
    sendAt: row.send_at ?? null,
    sentAt: row.sent_at ?? null,
    status: (row.status as "sent" | "scheduled" | null) ?? "sent",
    allowComments: row.allow_comments,
    allowReactions: row.allow_reactions,
    media: toAnnouncementMedia(row),
    contentPreview: toPlain(row.content) ?? "",
    fullContent: includeDetails ? row.content : undefined,
  }));
}

async function resolveSenderNames(
  ids: string[]
): Promise<
  Record<
    string,
    {
      full_name: string | null;
      email?: string | null;
      avatar_url?: string | null;
      title?: string | null;
    }
  >
> {
  const svc = createServiceClient();
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0)
    return {} as Record<
      string,
      {
        full_name: string | null;
        email?: string | null;
        avatar_url?: string | null;
        title?: string | null;
      }
    >;

  const identityMap: Record<string, { full_name: string | null; email?: string | null; avatar_url?: string | null; title?: string | null }> =
    {};

  // 1) Perfis (fonte principal)
  const { data: profiles, error: profilesError } = await svc
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", uniqueIds);

  if (profilesError) {
    console.warn("MESSAGES inbox profile lookup error:", profilesError);
  }

  (profiles ?? []).forEach((p: any) => {
    identityMap[p.id as string] = {
      full_name: p.full_name ?? null,
      email: null,
      avatar_url: p.avatar_url ?? null,
      title: null,
    };
  });

  // 1.1) Cargo (employee_profile)
  try {
    const { data: cargoRows } = await svc
      .from("employee_profile")
      .select("user_id, cargo")
      .in("user_id", uniqueIds);

    (cargoRows ?? []).forEach((row: any) => {
      const existing = identityMap[row.user_id as string];
      const cargo = (row?.cargo as string | null) ?? null;
      if (existing) {
        existing.title = cargo ?? existing.title ?? null;
      } else {
        identityMap[row.user_id as string] = {
          full_name: null,
          email: null,
          avatar_url: null,
          title: cargo,
        };
      }
    });
  } catch (err) {
    console.warn("MESSAGES inbox cargo lookup error:", err);
  }

  // 2) Fallback: Auth admin (caso profile não tenha nome)
  const missing = uniqueIds.filter((id) => !identityMap[id] || !identityMap[id].full_name);
  if (missing.length) {
    await Promise.all(
      missing.map(async (id) => {
        try {
          const { data, error } = await svc.auth.admin.getUserById(id);
          if (error || !data?.user) return;
          const name = (data.user.user_metadata as any)?.name ?? null;
          const email = data.user.email ?? null;
          const avatar =
            (data.user.user_metadata as any)?.avatar_url ?? null;
          if (!identityMap[id]) {
            identityMap[id] = { full_name: name ?? null, email, avatar_url: avatar };
          } else {
            if (!identityMap[id].full_name) {
              identityMap[id].full_name = name ?? null;
            }
            if (!identityMap[id].email) {
              identityMap[id].email = email ?? null;
            }
            if (!identityMap[id].avatar_url) {
              identityMap[id].avatar_url = avatar ?? null;
            }
          }
        } catch (err) {
          console.warn("MESSAGES inbox admin user lookup error:", err);
        }
      })
    );
  }

  return identityMap;
}

async function fetchAnnouncementItems(
  userId: string,
  orgId: string,
  opts?: { withDetails?: boolean; includeAllForPlatform?: boolean }
): Promise<InboxItem[]> {
  const includeDetails = opts?.withDetails ?? false;
  const includeAllForPlatform = opts?.includeAllForPlatform ?? false;
  const svc = createServiceClient();

  if (includeAllForPlatform) {
    const { data: announcements, error: annErr } = await svc
      .from("announcements")
      .select(ANNOUNCEMENT_SELECT_FIELDS)
      .in("status", ["sent", "scheduled"]);

    if (annErr || !announcements) {
      console.warn("ANNOUNCEMENTS fetch (platform) error:", annErr);
      return [];
    }

    const announcementRows = announcements as unknown as AnnouncementRow[];
    const authorIds = Array.from(
      new Set(announcementRows.map((row) => row.author_id).filter(Boolean))
    );
    const authorMap = await resolveSenderNames(authorIds);

    const announcementItems = sortAnnouncementItems(
      mapAnnouncementRows(announcementRows, authorMap, includeDetails)
    );

    if (!includeDetails) {
      return announcementItems.map((item) => ({
        kind: "announcement" as const,
        ...item,
      }));
    }

    await hydrateAnnouncementDetails(svc, announcementItems, userId);

    return announcementItems.map((item) => ({
      kind: "announcement" as const,
      ...item,
    }));
  }

  const { data: myGroups } = await svc
    .from("user_group_members")
    .select("group_id")
    .eq("user_id", userId)
    .eq("org_id", orgId);
  const groupIds = Array.isArray(myGroups)
    ? myGroups.map((g: any) => g.group_id as string).filter(Boolean)
    : [];

  const recipientFilter = [
    `user_id.eq.${userId}`,
    groupIds.length ? `group_id.in.(${groupIds.join(",")})` : "",
  ]
    .filter(Boolean)
    .join(",");

  const { data: recipientRows, error: recErr } = await svc
    .from("announcement_recipients")
    .select("announcement_id")
    .eq("org_id", orgId)
    .or(recipientFilter || `user_id.eq.${userId}`);

  if (recErr) {
    console.warn("ANNOUNCEMENTS recipients fetch error:", recErr);
  }

  const announcementIds = Array.isArray(recipientRows)
    ? Array.from(
        new Set(
          recipientRows
            .map((row: any) => row.announcement_id as string)
            .filter(Boolean)
        )
      )
    : [];

  if (!announcementIds.length) {
    return [];
  }

  const { data: announcements, error: annErr } = await svc
    .from("announcements")
    .select(ANNOUNCEMENT_SELECT_FIELDS)
    .in("id", announcementIds)
    .eq("status", "sent");

  if (annErr || !announcements) {
    console.warn("ANNOUNCEMENTS fetch error:", annErr);
    return [];
  }
  const announcementRows = announcements as unknown as AnnouncementRow[];

  const authorIds = Array.from(
    new Set(
      announcementRows
        .map((announcement) => announcement.author_id)
        .filter(Boolean)
    )
  );
  const authorMap = await resolveSenderNames(authorIds);

  const announcementItems = sortAnnouncementItems(
    mapAnnouncementRows(announcementRows, authorMap, includeDetails)
  );

  if (!includeDetails) {
    return announcementItems.map((item) => ({
      kind: "announcement" as const,
      ...item,
    }));
  }

  await hydrateAnnouncementDetails(svc, announcementItems, userId);

  return announcementItems.map((item) => ({
    kind: "announcement" as const,
    ...item,
  }));
}

async function hydrateAnnouncementDetails(
  svc: ReturnType<typeof createServiceClient>,
  items: AnnouncementItem[],
  userId: string
) {
  if (!items.length) return;
  const annIdList = items.map((item) => item.announcementId);

  const { data: commentRows, error: commentErr } = await svc
    .from("announcement_comments")
    .select("id, announcement_id, author_id, content, created_at")
    .in("announcement_id", annIdList)
    .order("created_at", { ascending: true });

  if (!commentErr && commentRows) {
    const commentAuthorIds = Array.from(
      new Set(commentRows.map((row: any) => row.author_id as string))
    );
    const commentAuthorMap = await resolveSenderNames(commentAuthorIds);
    const commentsByAnnouncement = new Map<string, AnnouncementComment[]>();

    commentRows.forEach((row: any) => {
      const comment: AnnouncementComment = {
        id: row.id as string,
        authorId: row.author_id as string,
        authorName:
          commentAuthorMap[row.author_id]?.full_name ||
          commentAuthorMap[row.author_id]?.email ||
          null,
        authorAvatar: commentAuthorMap[row.author_id]?.avatar_url ?? null,
        authorTitle: commentAuthorMap[row.author_id]?.title ?? null,
        content: row.content as string,
        createdAt: row.created_at as string,
        isMine: row.author_id === userId,
      };
      const list = commentsByAnnouncement.get(row.announcement_id as string);
      if (list) {
        list.push(comment);
      } else {
        commentsByAnnouncement.set(row.announcement_id as string, [comment]);
      }
    });

    items.forEach((item) => {
      item.comments = commentsByAnnouncement.get(item.announcementId) ?? [];
    });
  }

  const { data: reactionRows, error: reactionErr } = await svc
    .from("announcement_reactions")
    .select("announcement_id, author_id, emoji")
    .in("announcement_id", annIdList);

  if (!reactionErr && reactionRows) {
    const reactionMap = new Map<string, AnnouncementReactionSummary[]>();

    items.forEach((item) => {
      reactionMap.set(
        item.announcementId,
        ANNOUNCEMENT_REACTIONS.map((emoji) => ({
          emoji,
          count: 0,
          reacted: false,
        }))
      );
    });

    reactionRows.forEach((row: any) => {
      const list = reactionMap.get(row.announcement_id as string);
      if (!list) return;
      let entry = list.find((r) => r.emoji === row.emoji);
      if (!entry) {
        entry = { emoji: row.emoji as string, count: 0, reacted: false };
        list.push(entry);
      }
      entry.count += 1;
      if (row.author_id === userId) {
        entry.reacted = true;
      }
    });

    items.forEach((item) => {
      item.reactions = reactionMap.get(item.announcementId) ?? [];
    });
  }
}

async function fetchAuthoredAnnouncements(
  userId: string,
  orgId: string,
  opts?: { withDetails?: boolean }
): Promise<AnnouncementItem[]> {
  const includeDetails = opts?.withDetails ?? false;
  const svc = createServiceClient();

  const { data: announcements, error } = await svc
    .from("announcements")
    .select(ANNOUNCEMENT_SELECT_FIELDS)
    .eq("org_id", orgId)
    .eq("author_id", userId);

  if (error || !announcements) {
    console.warn("ANNOUNCEMENTS fetch authored error:", error);
    return [];
  }
  const announcementRows = announcements as unknown as AnnouncementRow[];

  const authorIds = Array.from(
    new Set(announcementRows.map((row) => row.author_id).filter(Boolean))
  );
  const authorMap = await resolveSenderNames(authorIds);

  const items = sortAnnouncementItems(
    mapAnnouncementRows(announcementRows, authorMap, includeDetails)
  );

  if (includeDetails) {
    await hydrateAnnouncementDetails(svc, items, userId);
  }

  return items;
}

export async function fetchAnnouncementDetail(
  auth: AuthContext,
  announcementId: string
): Promise<{
  announcement: AnnouncementItem;
  canInteract: boolean;
  canManage: boolean;
} | null> {
  const svc = createServiceClient();
  const access = await getAnnouncementViewAccess(svc, auth, announcementId);
  if (!access) {
    return null;
  }

  const { data: announcementRow, error } = await svc
    .from("announcements")
    .select(ANNOUNCEMENT_SELECT_FIELDS)
    .eq("id", announcementId)
    .maybeSingle();

  if (error || !announcementRow) {
    console.warn("ANNOUNCEMENTS fetch detail error:", error);
    return null;
  }
  const typedAnnouncementRow = announcementRow as unknown as AnnouncementRow;

  const authorIds = typedAnnouncementRow.author_id
    ? [typedAnnouncementRow.author_id]
    : [];
  const authorMap = await resolveSenderNames(authorIds);
  const [announcement] = mapAnnouncementRows(
    [typedAnnouncementRow],
    authorMap,
    true
  );

  await hydrateAnnouncementDetails(svc, [announcement], auth.userId);

  return {
    announcement,
    canInteract: access.canInteract,
    canManage: canManageAnnouncement(auth, access.announcement),
  };
}

async function fetchCalendarEventItems(
  userId: string,
  orgId: string,
  unitIds: string[]
): Promise<InboxItem[]> {
  const svc = createServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const orParts = ["unit_id.is.null", `created_by.eq.${userId}`];
  if (unitIds.length) {
    const inClause = unitIds
      .map((value) => `"${value}"`)
      .join(",");
    orParts.push(`unit_id.in.(${inClause})`);
  }

  const { data: events, error } = await svc
    .from("calendar_events")
    .select(
      "id, title, description, start_time, end_time, all_day, color, unit_id, created_by, created_at"
    )
    .eq("org_id", orgId)
    .gte("end_time", cutoffIso)
    .order("start_time", { ascending: false })
    .limit(100)
    .or(orParts.join(","));

  if (error || !events) {
    console.warn("CALENDAR inbox fetch error:", error);
    return [];
  }

  const creatorIds = Array.from(
    new Set(events.map((row: any) => row.created_by as string).filter(Boolean))
  );
  const creatorMap = await resolveSenderNames(creatorIds);

  return events.map((row: any) => {
    const creatorId = row.created_by as string | null;
    const identity = creatorId ? creatorMap[creatorId] : undefined;
    return {
      kind: "calendar_event" as const,
      eventId: row.id as string,
      title: row.title as string,
      senderId: creatorId,
      senderName:
        (creatorId && (identity?.full_name || identity?.email)) || null,
      senderAvatar: identity?.avatar_url ?? null,
      description: (row.description as string | null) ?? null,
      startsAt: row.start_time as string,
      endsAt: row.end_time as string,
      allDay: !!row.all_day,
      color: (row.color as string | null) ?? null,
      unitId: (row.unit_id as string | null) ?? null,
      createdAt: row.start_time as string,
    } satisfies InboxItem;
  });
}

export async function fetchInboxItems(
  userId: string,
  orgId: string,
  opts?: { unitIds?: string[] }
) {
  // user client read-only (para memberships/chats via RLS) + service client (identidades)
  const supabase = createServerClientReadOnly();
  const unitIds = opts?.unitIds ?? [];

  // 1) Conversas em que o usuário é membro
  const chatsResult = await fetchChats(supabase, userId, orgId, {
    limit: 30,
  });
  const chats: ChatSummary[] = chatsResult.items ?? [];

  // Resolver identidades de remetentes (criador ou último autor)
  const senderIds = new Set<string>();
  chats.forEach((chat) => {
    if (chat.last_message?.sender_id) senderIds.add(chat.last_message.sender_id);
    else if (chat.created_by) senderIds.add(chat.created_by);
  });

  const identityMap =
    senderIds.size > 0
      ? await resolveSenderNames(Array.from(senderIds))
      : {};

  const conversationItems: InboxItem[] = chats.map((chat) => {
    const senderId =
      chat.last_message?.sender_id || chat.created_by || null;
    const senderName =
      (senderId && (identityMap[senderId]?.full_name || identityMap[senderId]?.email)) || null;
    const senderAvatar =
      (senderId && identityMap[senderId]?.avatar_url) || null;
    return {
      kind: "conversation",
      chatId: chat.id,
      title: chat.name || "Conversa",
      senderName,
      senderId,
      senderAvatar,
      preview: toPlain(chat.last_message?.message ?? null),
      createdAt: chat.last_message?.created_at || chat.created_at,
    };
  });

  const announcementItems = await fetchAnnouncementItems(userId, orgId);
  const calendarItems = await fetchCalendarEventItems(userId, orgId, unitIds);

  const items = [...conversationItems, ...announcementItems, ...calendarItems].sort(
    (a, b) => {
      const aReference =
        a.kind === "announcement" ? a.publishedAt ?? a.createdAt : a.createdAt;
      const bReference =
        b.kind === "announcement" ? b.publishedAt ?? b.createdAt : b.createdAt;
      return bReference.localeCompare(aReference);
    }
  );

  return items;
}

export { fetchAnnouncementItems, fetchAuthoredAnnouncements };
