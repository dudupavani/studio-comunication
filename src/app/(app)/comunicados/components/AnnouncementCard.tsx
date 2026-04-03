"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import UserSummary from "@/components/shared/user-summary";
import { sanitizeHtml } from "@/lib/utils/sanitize";

type Props = {
  announcement: AnnouncementItem;
};

export default function AnnouncementCard({ announcement }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [reactionPending, setReactionPending] = useState(false);

  const isScheduled = announcement.status === "scheduled";
  const displayDate =
    announcement.publishedAt ??
    (isScheduled ? announcement.sendAt : announcement.sentAt) ??
    announcement.createdAt;
  const commentCount = announcement.comments?.length ?? 0;
  const reactionSummary = announcement.reactions?.find(
    (reaction) => reaction.emoji === "👍"
  );

  const sanitizedPreview = useMemo(
    () =>
      sanitizeHtml(
        announcement.contentPreview ?? announcement.fullContent ?? ""
      ),
    [announcement.contentPreview, announcement.fullContent]
  );

  const toggleReaction = async () => {
    if (!announcement.allowReactions || reactionPending) return;
    setReactionPending(true);
    try {
      const res = await fetch(
        `/api/comunicados/${announcement.announcementId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji: "👍" }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast({
          title: "Erro ao reagir",
          description: body?.error ?? res.statusText,
          variant: "destructive",
        });
        return;
      }

      router.refresh();
    } finally {
      setReactionPending(false);
    }
  };

  return (
    <Card className="border border-border">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <UserSummary
            avatarUrl={announcement.senderAvatar}
            name={announcement.senderName || "Remetente desconhecido"}
            subtitle={announcement.senderTitle ?? undefined}
            fallback="Remetente"
          />

          <div className="space-y-1 text-right text-xs text-muted-foreground">
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
        </div>

        <Link
          href={`/comunicados/${announcement.announcementId}`}
          className="block space-y-3">
          {announcement.media?.kind === "image" ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={announcement.media.url}
                alt={announcement.title}
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="line-clamp-2 font-semibold">{announcement.title}</p>
            <div
              className="line-clamp-3 text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          </div>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          {announcement.allowReactions ? (
            <Button
              type="button"
              size="sm"
              variant={reactionSummary?.reacted ? "secondary" : "outline"}
              disabled={reactionPending}
              onClick={toggleReaction}
              className="px-2">
              <span className="mr-0 text-base sm:text-lg">👍</span>
              {reactionSummary?.count ? <span>{reactionSummary.count}</span> : null}
            </Button>
          ) : (
            <div />
          )}

          {announcement.allowComments ? (
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href={`/comunicados/${announcement.announcementId}`}>
                Comentários ({commentCount})
              </Link>
            </Button>
          ) : (
            <Button asChild variant="link" size="sm" className="px-0">
              <Link href={`/comunicados/${announcement.announcementId}`}>
                Abrir post
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
