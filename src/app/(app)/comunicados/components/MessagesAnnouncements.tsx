import Link from "next/link";
import { CirclePlus, ChartColumn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnnouncementCard from "./AnnouncementCard";
import { SentAnnouncementsTable } from "./SentAnnouncementsTable";
import { Button } from "@/components/ui/button";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";

type MessagesAnnouncementsProps = {
  canCreateAnnouncements: boolean;
  canViewSentTab: boolean;
  canViewMetrics: boolean;
  receivedAnnouncements: AnnouncementItem[];
  sentItems: AnnouncementItem[];
};

export default function MessagesAnnouncements({
  canCreateAnnouncements,
  canViewSentTab,
  canViewMetrics,
  receivedAnnouncements,
  sentItems,
}: MessagesAnnouncementsProps) {
  const defaultTab = "received";

  return (
    <div className="flex flex-col h-full gap-4">
      <Tabs defaultValue={defaultTab} className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="received">Recebidos</TabsTrigger>
            {canViewSentTab ? (
              <TabsTrigger value="sent">Enviados</TabsTrigger>
            ) : null}
          </TabsList>
          <div className="flex items-center gap-2">
            {canViewMetrics ? (
              <Button asChild variant="outline">
                <Link href="/comunicados/metricas">
                  <ChartColumn />
                  <span className="hidden sm:flex">Ver métricas</span>
                </Link>
              </Button>
            ) : null}
            {canCreateAnnouncements ? (
              <Button asChild>
                <Link href="/comunicados/novo">
                  <CirclePlus />
                  <span className="hidden sm:inline">Criar comunicado</span>
                </Link>
              </Button>
            ) : null}
          </div>
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
            <div className="space-y-3">
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
