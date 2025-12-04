import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthContext } from "@/lib/messages/auth-context";
import {
  fetchAnnouncementItems,
  fetchAuthoredAnnouncements,
} from "@/lib/messages/inbox";
import { NewAnnouncementModal } from "./NewAnnouncementModal";
import AnnouncementCard from "./AnnouncementCard";
import { SentAnnouncementsTable } from "./SentAnnouncementsTable";

export default async function MessagesAnnouncements({
  canCreateAnnouncements,
}: {
  canCreateAnnouncements: boolean;
}) {
  const auth = await getAuthContext();
  const canViewSentTab =
    auth.isOrgAdmin || auth.isUnitMaster || auth.role === "org_master";
  const receivedPromise = fetchAnnouncementItems(auth.userId, auth.orgId, {
    withDetails: true,
  });
  const sentPromise = canViewSentTab
    ? fetchAuthoredAnnouncements(auth.userId, auth.orgId, {
        withDetails: true,
      })
    : Promise.resolve([]);
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
  const defaultTab = canViewSentTab ? "sent" : "received";

  return (
    <div className="flex flex-col h-full gap-4">
      <Tabs defaultValue={defaultTab} className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <TabsList>
            {canViewSentTab ? (
              <TabsTrigger value="sent">Enviados</TabsTrigger>
            ) : null}
            <TabsTrigger value="received">Recebidos</TabsTrigger>
          </TabsList>
          {canCreateAnnouncements ? (
            <NewAnnouncementModal
              canCreateAnnouncement={canCreateAnnouncements}
            />
          ) : null}
        </div>

        {canViewSentTab ? (
          <TabsContent value="sent" className="flex-1">
            {sentItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-2">
                  <div>Você ainda não enviou comunicados</div>
                </CardContent>
              </Card>
            ) : (
              <div className="sm:border sm:border-border sm:rounded-lg">
                <SentAnnouncementsTable items={sentItems} />
              </div>
            )}
          </TabsContent>
        ) : null}

        <TabsContent value="received" className="flex-1">
          {receivedAnnouncements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-2">
                <div>Nenhum comunicado recebido ainda.</div>
                <div className="text-xs">
                  Assim que algum gestor publicar um comunicado para você, ele
                  aparecerá aqui.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 ">
              {receivedAnnouncements.map((item) => (
                <AnnouncementCard
                  key={item.announcementId}
                  announcement={item}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
