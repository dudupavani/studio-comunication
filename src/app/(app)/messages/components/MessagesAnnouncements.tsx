import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getAuthContext } from "@/lib/messages/auth-context";
import { fetchAnnouncementItems } from "@/lib/messages/inbox";
import { NewAnnouncementModal } from "./NewAnnouncementModal";
import AnnouncementCard from "./AnnouncementCard";

export default async function MessagesAnnouncements({
  canCreateAnnouncements,
}: {
  canCreateAnnouncements: boolean;
}) {
  const auth = await getAuthContext();
  const items = await fetchAnnouncementItems(auth.userId, auth.orgId, {
    withDetails: true,
  });

  return (
    <div className="flex h-full flex-col gap-4 max-w-4xl">
      <h2>Comunicados</h2>
      <div className="flex items-center justify-between">
        {canCreateAnnouncements ? (
          <NewAnnouncementModal
            canCreateAnnouncement={canCreateAnnouncements}
          />
        ) : null}
      </div>

      {items.length === 0 ? (
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
        <div className="space-y-6">
          {items
            .filter((item) => item.kind === "announcement")
            .map((item) => (
              <AnnouncementCard key={item.announcementId} announcement={item} />
            ))}
        </div>
      )}
    </div>
  );
}
