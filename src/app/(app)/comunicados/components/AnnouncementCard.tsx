"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <Card className="border border-gray-200">
      <CardContent className="p-0">
        <AnnouncementModal announcement={announcement}>
          <button
            type="button"
            className="w-full space-y-6 px-4 py-6 sm:py-4 sm:px-6 md:py-6 md:px-8">
            <div className="flex items-start justify-between gap-4">
              <UserSummary
                avatarUrl={announcement.senderAvatar}
                name={announcement.senderName || "Remetente desconhecido"}
                subtitle={announcement.senderTitle ?? undefined}
                fallback="Remetente"
              />
              <div className="text-xs text-muted-foreground text-right space-y-1">
                <div>{new Date(announcement.createdAt).toLocaleString()}</div>
                {isScheduled ? (
                  <span className="inline-flex items-center justify-end rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Agendado
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-1 text-left">
              <p className="text-base sm:text-lg font-semibold">
                {announcement.title}
              </p>
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
          <div className="flex items-center justify-between pb-6 px-4 sm:px-6 md:px-8">
            {announcement.allowReactions ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={reactions?.[0]?.reacted ? "secondary" : "outline"}
                  disabled={reactionPending}
                  onClick={() => toggleReaction("👍")}>
                  <span className="mr-0 text-base sm:text-lg">👍</span>
                  {reactions?.[0]?.count ? (
                    <span>{reactions[0].count}</span>
                  ) : null}
                </Button>
              </div>
            ) : null}
            {announcement.allowComments ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowComments((prev) => !prev)}>
                <span className="text-xs sm:text-sm flex items-center gap-1">
                  Comentários ({commentCount})
                  <ChevronDown
                    className={cn(
                      "transition-transform",
                      showComments ? "rotate-180" : "rotate-0"
                    )}
                    size={14}
                  />
                </span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {announcement.allowComments && showComments ? (
          <div className="space-y-4 border-t border-gray-200 px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6 bg-muted">
            <div className="space-y-2">
              {commentCount > 0
                ? announcement.comments!.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border p-4 text-sm space-y-4 sm:space-y-2 bg-white">
                    <div className="flex flex-col-reverse sm:flew-row items-start justify-between gap-1 sm:gap-3">
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
                : null}
            </div>
            <div className="flex gap-2 relative">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="min-h-[40px] text-sm bg-white"
              />
              <div className="absolute right-2 bottom-2">
                <Button
                  type="button"
                  size="icon-md"
                  variant="secondary"
                  disabled={isPending}
                  onClick={submitComment}>
                  {isPending ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
