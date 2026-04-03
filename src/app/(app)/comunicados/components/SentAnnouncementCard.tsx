"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  EllipsisVertical,
  Pen,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnnouncementDeleteButton } from "./AnnouncementDeleteButton";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import { sanitizeHtml } from "@/lib/utils/sanitize";

type Props = {
  announcement: AnnouncementItem;
};

export function SentAnnouncementCard({ announcement }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isScheduled = announcement.status === "scheduled";
  const displayDate =
    announcement.publishedAt ??
    (isScheduled ? announcement.sendAt : announcement.sentAt) ??
    announcement.createdAt;

  const sanitizedPreview = useMemo(
    () =>
      sanitizeHtml(
        announcement.contentPreview ?? announcement.fullContent ?? ""
      ),
    [announcement.contentPreview, announcement.fullContent]
  );

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6">
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>{new Date(displayDate).toLocaleString()}</div>
            {isScheduled ? (
              <Badge variant="violet">
                <CalendarClock />
                Agendado
              </Badge>
            ) : (
              <Badge variant="outline">Publicado</Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ações do post">
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={`/comunicados/${announcement.announcementId}/editar`}
                  className="flex items-center gap-2">
                  <Pen className="h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="flex items-center gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link
          href={`/comunicados/${announcement.announcementId}`}
          className="block space-y-3 px-4 pb-5 sm:px-6 sm:pb-6">
          {announcement.media?.kind === "image" ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={announcement.media.url}
                alt={announcement.title}
                className="h-52 w-full object-cover"
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <h5 className="line-clamp-2">{announcement.title}</h5>
            <div
              className="text-sm text-muted-foreground line-clamp-3"
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          </div>
        </Link>
      </CardContent>

      <AnnouncementDeleteButton
        announcementId={announcement.announcementId}
        trigger={null}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}
