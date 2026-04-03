import { getAuthContext } from "@/lib/messages/auth-context";
import { notFound } from "next/navigation";
import MessagesAnnouncements from "./components/MessagesAnnouncements";
import {
  fetchAnnouncementItems,
  fetchAuthoredAnnouncements,
} from "@/lib/messages/inbox";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";

export default async function ComunicadosPage() {
  const auth = await getAuthContext();
  if (!auth) {
    return notFound();
  }
  const canCreate =
    auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;
  const canViewSentTab =
    auth.isPlatformAdmin ||
    auth.isOrgAdmin ||
    auth.isUnitMaster ||
    auth.role === "org_master";
  const canViewMetrics = auth.isOrgAdmin || auth.isPlatformAdmin;

  const receivedPromise = fetchAnnouncementItems(auth.userId, auth.orgId, {
    withDetails: true,
    includeAllForPlatform: auth.isPlatformAdmin,
  });
  const sentPromise: Promise<AnnouncementItem[]> = canViewSentTab
    ? fetchAuthoredAnnouncements(auth.userId, auth.orgId, {
        withDetails: true,
      })
    : Promise.resolve<AnnouncementItem[]>([]);

  const [receivedItems, sentItems] = await Promise.all([
    receivedPromise,
    sentPromise,
  ]);

  const receivedAnnouncements = receivedItems.filter(
    (
      item
    ): item is Extract<
      (typeof receivedItems)[number],
      { kind: "announcement" }
    > => item.kind === "announcement"
  );

  return (
    <div className="h-full p-4 sm:p-6">
      <MessagesAnnouncements
        canCreateAnnouncements={canCreate}
        canViewSentTab={canViewSentTab}
        canViewMetrics={canViewMetrics}
        feedAnnouncements={receivedAnnouncements}
        sentItems={sentItems}
      />
    </div>
  );
}
