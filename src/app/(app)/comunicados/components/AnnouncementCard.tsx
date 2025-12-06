"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import {
  ANNOUNCEMENT_REACTIONS,
  type AnnouncementItem,
} from "@/lib/messages/announcement-entities";
import AnnouncementModal from "./AnnouncementModal";
import DOMPurify from "dompurify";
import UserSummary from "@/components/shared/user-summary";

export default function AnnouncementCard({
  announcement,
}: {
  announcement: AnnouncementItem;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [reactionPending, setReactionPending] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const sanitizedPreview = useMemo(
    () =>
      DOMPurify.sanitize(
        announcement.contentPreview ?? announcement.fullContent ?? ""
      ),
    [announcement.contentPreview, announcement.fullContent]
  );

  useEffect(() => {
    setComment("");
  }, [announcement.announcementId]);

  const submitComment = async () => {
    if (!announcement.allowComments) return;
    const trimmed = comment.trim();
    if (!trimmed.length) {
      toast({ title: "Comentário vazio", variant: "destructive" });
      return;
    }
    startTransition(() => {
      (async () => {
        const res = await fetch(
          `/api/comunicados/${announcement.announcementId}/comments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trimmed }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          toast({
            title: "Erro ao comentar",
            description: body?.error ?? res.statusText,
            variant: "destructive",
          });
          return;
        }
        setComment("");
        router.refresh();
      })();
    });
  };

  const toggleReaction = async (emoji: string) => {
    if (!announcement.allowReactions || reactionPending) return;
    setReactionPending(true);
    try {
      const res = await fetch(
        `/api/comunicados/${announcement.announcementId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
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

  const reactions =
    announcement.reactions ??
    ANNOUNCEMENT_REACTIONS.map((emoji) => ({
      emoji,
      count: 0,
      reacted: false,
    }));

  const isScheduled = announcement.status === "scheduled";
  const commentCount = announcement.comments?.length ?? 0;

  return (
    <Card className="shadow-md border border-gray-200">
      <CardContent className="px-4 py-6 sm:py-4 sm:px-6 md:py-6 md:px-8">
        <AnnouncementModal announcement={announcement}>
          <button
            type="button"
            className="group w-full text-left mb-4 space-y-4 rounded-md border border-transparent p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-white shadow-md">
                <AvatarImage
                  src={announcement.senderAvatar ?? undefined}
                  alt={announcement.senderName ?? "Remetente"}
                />
                <AvatarFallback>
                  {(announcement.senderName ?? "??")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-left">
                <div className="font-semibold">
                  {announcement.senderName || "Remetente desconhecido"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>
                    {new Date(announcement.createdAt).toLocaleString()}
                  </span>
                  {isScheduled ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Agendado
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <h5 className="font-semibold">{announcement.title}</h5>
              <div
                className="text-sm max-w-none text-muted-foreground line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizedPreview,
                }}
              />
            </div>
          </button>
        </AnnouncementModal>

        {announcement.allowComments || announcement.allowReactions ? (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center sm:justify-between">
            {announcement.allowReactions ? (
              <div className="flex flex-wrap gap-2">
                {reactions.map((reaction) => (
                  <Button
                    key={reaction.emoji}
                    type="button"
                    size="sm"
                    className="px-2 sm:px-auto"
                    variant={reaction.reacted ? "secondary" : "ghost"}
                    disabled={reactionPending}
                    onClick={() => toggleReaction(reaction.emoji)}>
                    <span className="mr-0 md:mr-1 text-base sm:text-lg">
                      {reaction.emoji}
                    </span>
                    {reaction.count > 0 ? <span>{reaction.count}</span> : null}
                  </Button>
                ))}
              </div>
            ) : null}
            {announcement.allowComments ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowComments((prev) => !prev)}>
                <span>Comentários ({commentCount})</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {announcement.allowComments && showComments ? (
          <div className="space-y-4">
            <div className="space-y-2 mt-4">
              {commentCount > 0 ? (
                announcement.comments!.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-md border p-4 text-sm space-y-4 sm:space-y-2 bg-muted">
                    <div className="flex flex-col-reverse sm:flow-row items-start justify-between gap-1 sm:gap-3">
                      <UserSummary
                        avatarUrl={comment.authorAvatar}
                        name={
                          comment.authorName
                            ? comment.isMine
                              ? `${comment.authorName} (você)`
                              : comment.authorName
                            : "Usuário"
                        }
                        subtitle={comment.authorTitle ?? undefined}
                        fallback="Usuário"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap pl-12 sm:pl-0">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 pl-0 sm:pl-12 whitespace-pre-wrap text-sm text-primary">
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum comentário ainda.
                </p>
              )}
            </div>
            <div className="flex gap-2 relative">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="min-h-[40px] text-sm"
              />
              <div className="absolute right-2 bottom-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={isPending}
                  onClick={submitComment}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
