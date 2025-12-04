import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ArrowLeft, SendHorizontal } from "lucide-react";
import { getAuthContext } from "@/lib/messages/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { EditAnnouncementForm } from "../../components/EditAnnouncementForm";
import type { UserOption } from "@/components/communication/UserMultiSelect";
import type { UserGroupOption } from "@/components/communication/GroupMultiSelect";
import type { TeamOption } from "@/components/communication/TeamMultiSelect";

function toUniqueList(values: (string | null)[]) {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

export default async function EditAnnouncementPage({
  params,
}: {
  params: { announcementId: string };
}) {
  const { announcementId } = params;
  const auth = await getAuthContext();
  const svc = createServiceClient();

  const { data: announcement, error } = await svc
    .from("announcements")
    .select(
      "id, org_id, author_id, title, content, allow_comments, allow_reactions, send_at, sent_at, status"
    )
    .eq("id", announcementId)
    .maybeSingle();

  if (error || !announcement || announcement.org_id !== auth.orgId) {
    return notFound();
  }

  const isAuthor =
    announcement.author_id === auth.userId || auth.isPlatformAdmin;
  if (!isAuthor) {
    return notFound();
  }

  const { data: recipientRows } = await svc
    .from("announcement_recipients")
    .select("user_id, group_id")
    .eq("announcement_id", announcementId)
    .eq("org_id", auth.orgId);

  const userIds = toUniqueList(
    (recipientRows ?? []).map((row: any) => row.user_id as string | null)
  );
  const groupIds = toUniqueList(
    (recipientRows ?? []).map((row: any) => row.group_id as string | null)
  );

  const users: UserOption[] = [];
  if (userIds.length) {
    const { data: profiles } = await svc
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const { data: cargos } = await svc
      .from("employee_profile")
      .select("user_id, cargo")
      .in("user_id", userIds);

    const cargoMap = new Map<string, string | null>();
    (cargos ?? []).forEach((row: any) =>
      cargoMap.set(row.user_id as string, (row.cargo as string | null) ?? null)
    );

    const profileMap = new Map<
      string,
      { full_name: string | null; avatar_url: string | null }
    >();
    (profiles ?? []).forEach((row: any) =>
      profileMap.set(row.id as string, {
        full_name: (row.full_name as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
      })
    );

    userIds.forEach((id) => {
      const profile = profileMap.get(id);
      users.push({
        id,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        cargo: cargoMap.get(id) ?? null,
      });
    });
  }

  let groups: UserGroupOption[] = [];
  if (groupIds.length) {
    const { data: groupRows } = await svc
      .from("user_groups")
      .select("id, name, color")
      .in("id", groupIds)
      .eq("org_id", auth.orgId);

    const { data: members } = await svc
      .from("user_group_members")
      .select("group_id")
      .in("group_id", groupIds)
      .eq("org_id", auth.orgId);

    const countMap = new Map<string, number>();
    (members ?? []).forEach((row: any) => {
      const id = row.group_id as string | null;
      if (!id) return;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    });

    groups =
      groupRows?.map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        color: (row.color as string | null) ?? null,
        membersCount: countMap.get(row.id as string) ?? 0,
      })) ?? [];
  }

  const teams: TeamOption[] = [];

  return (
    <div className="h-full space-y-6 p-6">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div>
          <Button asChild variant="outline">
            <Link href="/comunicados">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <Badge
              variant={
                announcement.status === "scheduled" ? "violet" : "green"
              }>
              {announcement.status === "scheduled" ? (
                <>
                  <CalendarClock />
                  Agendado
                </>
              ) : (
                <>
                  <SendHorizontal />
                  Enviado
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      <EditAnnouncementForm
        announcementId={announcementId}
        initialTitle={announcement.title}
        initialContent={announcement.content}
        initialAllowComments={announcement.allow_comments}
        initialAllowReactions={announcement.allow_reactions}
        initialSendAt={(announcement.send_at as string | null) ?? null}
        status={(announcement.status as "sent" | "scheduled" | null) ?? null}
        recipients={{ users, groups, teams }}
      />
    </div>
  );
}
