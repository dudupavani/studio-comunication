import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pen, CalendarClock, SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/messages/auth-context";
import { fetchAnnouncementDetail } from "@/lib/messages/inbox";
import { AnnouncementDetailContent } from "../components/AnnouncementDetailContent";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const auth = await getAuthContext();
  if (!auth) {
    return notFound();
  }

  const detail = await fetchAnnouncementDetail(auth, announcementId);
  if (!detail) {
    return notFound();
  }

  const { announcement, canInteract, canManage } = detail;

  return (
    <div className="h-full space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/comunicados">
              <ArrowLeft />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Badge
              variant={announcement.status === "scheduled" ? "violet" : "green"}>
              {announcement.status === "scheduled" ? (
                <>
                  <CalendarClock />
                  Agendado
                </>
              ) : (
                <>
                  <SendHorizontal />
                  Publicado
                </>
              )}
            </Badge>
          </div>
        </div>

        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/comunicados/${announcement.announcementId}/editar`}>
              <Pen />
              Editar post
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-4xl">
        <AnnouncementDetailContent
          announcement={announcement}
          canInteract={canInteract}
          canViewMetrics={canManage}
        />
      </div>
    </div>
  );
}
