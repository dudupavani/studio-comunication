import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { AuthContext } from "@/lib/messages/auth-context";

export type AnnouncementAccessRecord = {
  id: string;
  org_id: string;
  author_id: string;
  allow_comments: boolean;
  allow_reactions: boolean;
  status?: string;
};

export type AnnouncementViewAccess = {
  announcement: AnnouncementAccessRecord;
  canInteract: boolean;
};

type AnnouncementManageRecord = Pick<
  AnnouncementAccessRecord,
  "author_id" | "org_id"
>;

export function canManageAnnouncement(
  auth: AuthContext,
  announcement: AnnouncementManageRecord
) {
  return (
    auth.isPlatformAdmin ||
    (announcement.org_id === auth.orgId && auth.role === "org_master") ||
    announcement.author_id === auth.userId
  );
}

async function isAnnouncementRecipient(
  svc: SupabaseClient<Database>,
  auth: AuthContext,
  announcementId: string
) {
  if (!auth.isPlatformAdmin && auth.orgId) {
    const { data: recipients } = await svc
      .from("announcement_recipients")
      .select("user_id, group_id")
      .eq("announcement_id", announcementId)
      .eq("org_id", auth.orgId);

    if (recipients?.some((row: any) => row.user_id === auth.userId)) {
      return true;
    }

    const groupRecipients = (recipients ?? [])
      .map((row: any) => row.group_id as string | null)
      .filter(Boolean) as string[];

    if (!groupRecipients.length) {
      return false;
    }

    const { data: memberships } = await svc
      .from("user_group_members")
      .select("group_id")
      .eq("user_id", auth.userId)
      .eq("org_id", auth.orgId);

    const groupSet = new Set(
      (memberships ?? []).map((row: any) => row.group_id as string)
    );

    return groupRecipients.some((id) => groupSet.has(id));
  }

  return false;
}

export async function getAnnouncementViewAccess(
  svc: SupabaseClient<Database>,
  auth: AuthContext,
  announcementId: string
): Promise<AnnouncementViewAccess | null> {
  const { data: announcement, error } = await svc
    .from("announcements")
    .select("id, org_id, author_id, allow_comments, allow_reactions, status")
    .eq("id", announcementId)
    .maybeSingle();

  if (error || !announcement) {
    return null;
  }

  if (auth.isPlatformAdmin) {
    return {
      announcement,
      canInteract: true,
    };
  }

  const isManager = canManageAnnouncement(auth, announcement);
  const isAuthor = announcement.author_id === auth.userId;

  if ((announcement as any).status && (announcement as any).status !== "sent") {
    if (isManager || isAuthor) {
      return {
        announcement,
        canInteract: true,
      };
    }

    return null;
  }

  const isRecipient = await isAnnouncementRecipient(svc, auth, announcementId);
  if (isRecipient || isAuthor) {
    return {
      announcement,
      canInteract: true,
    };
  }

  if (isManager) {
    return {
      announcement,
      canInteract: false,
    };
  }

  return null;
}

export async function getAnnouncementIfRecipient(
  svc: SupabaseClient<Database>,
  auth: AuthContext,
  announcementId: string
): Promise<AnnouncementAccessRecord | null> {
  const access = await getAnnouncementViewAccess(svc, auth, announcementId);
  if (!access || !access.canInteract) {
    return null;
  }

  return access.announcement;
}
