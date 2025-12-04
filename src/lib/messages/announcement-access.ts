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

export async function getAnnouncementIfRecipient(
  svc: SupabaseClient<Database>,
  auth: AuthContext,
  announcementId: string
): Promise<AnnouncementAccessRecord | null> {
  const { data: announcement, error } = await svc
    .from("announcements")
    .select("id, org_id, author_id, allow_comments, allow_reactions, status")
    .eq("id", announcementId)
    .maybeSingle();

  if (error || !announcement || announcement.org_id !== auth.orgId) {
    return null;
  }

  if (announcement.author_id === auth.userId) {
    return announcement;
  }

  if ((announcement as any).status && (announcement as any).status !== "sent") {
    return null;
  }

  const { data: recipients } = await svc
    .from("announcement_recipients")
    .select("user_id, group_id")
    .eq("announcement_id", announcementId)
    .eq("org_id", auth.orgId);

  if (recipients?.some((row: any) => row.user_id === auth.userId)) {
    return announcement;
  }

  const groupRecipients = (recipients ?? [])
    .map((row: any) => row.group_id as string | null)
    .filter(Boolean) as string[];

  if (!groupRecipients.length) {
    return null;
  }

  const { data: memberships } = await svc
    .from("user_group_members")
    .select("group_id")
    .eq("user_id", auth.userId)
    .eq("org_id", auth.orgId);

  const groupSet = new Set(
    (memberships ?? []).map((row: any) => row.group_id as string)
  );

  const allowed = groupRecipients.some((id) => groupSet.has(id));
  return allowed ? announcement : null;
}
