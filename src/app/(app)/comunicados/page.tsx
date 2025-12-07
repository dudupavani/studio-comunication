import { getAuthContext } from "@/lib/messages/auth-context";
import MessagesAnnouncements from "./components/MessagesAnnouncements";
import {
  fetchAnnouncementItems,
  fetchAuthoredAnnouncements,
} from "@/lib/messages/inbox";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";

export default async function ComunicadosPage() {
  const auth = await getAuthContext();
  const canCreate =
    auth.isPlatformAdmin || auth.isOrgAdmin || auth.isUnitMaster;
  const canViewSentTab =
    auth.isOrgAdmin || auth.isUnitMaster || auth.role === "org_master";
  const canViewMetrics = auth.isOrgAdmin || auth.isPlatformAdmin;

  const receivedPromise = fetchAnnouncementItems(auth.userId, auth.orgId, {
    withDetails: true,
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
        receivedAnnouncements={receivedAnnouncements}
        sentItems={sentItems}
      />
    </div>
  );
}
