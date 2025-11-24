"use client";

import { useEffect, useState, useTransition } from "react";
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

export default function AnnouncementCard({
  announcement,
}: {
  announcement: AnnouncementItem;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const myComment = announcement.comments?.find((c) => c.isMine);
  const [comment, setComment] = useState(myComment?.content ?? "");
  const [isPending, startTransition] = useTransition();
  const [reactionPending, setReactionPending] = useState(false);

  useEffect(() => {
    setComment(myComment?.content ?? "");
  }, [myComment?.content]);

  const submitComment = async () => {
    if (!announcement.allowComments) return;
    const trimmed = comment.trim();
    if (!trimmed.length) {
      toast({ title: "Comentário vazio", variant: "destructive" });
      return;
    }
    startTransition(async () => {
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
      router.refresh();
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

  return (
    <Card className="shadow-md border border-gray-200">
      <CardContent className="px-4 py-6 md:py-8 md:px-8">
        <AnnouncementModal announcement={announcement}>
          <button
            type="button"
            className="group w-full text-left mb-8 space-y-4 rounded-md border border-transparent p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <div className="flex items-start gap-4">
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
                <div className="text-xs text-muted-foreground">
                  {new Date(announcement.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <h4 className="font-semibold">{announcement.title}</h4>
              <div
                className="text-sm max-w-none text-muted-foreground line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html:
                    announcement.contentPreview ??
                    announcement.fullContent ??
                    "",
                }}
              />
            </div>
          </button>
        </AnnouncementModal>

        {announcement.allowReactions ? (
          <div className="flex flex-wrap gap-2 mb-8">
            {reactions.map((reaction) => (
              <Button
                key={reaction.emoji}
                type="button"
                size="sm"
                variant={reaction.reacted ? "default" : "outline"}
                disabled={reactionPending}
                onClick={() => toggleReaction(reaction.emoji)}>
                <span className="mr-0 md:mr-1 text-lg">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </Button>
            ))}
          </div>
        ) : null}

        {announcement.allowComments ? (
          <div className="space-y-2">
            <div className="space-y-2">
              {announcement.comments && announcement.comments.length > 0 ? (
                announcement.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-md border p-4 text-sm">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="text-primary font-semibold">
                        {comment.authorName || "Usuário"}{" "}
                        {comment.isMine ? "(você)" : ""}
                      </span>
                      <span className="text-xs">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
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
                placeholder={
                  myComment
                    ? "Atualize seu comentário..."
                    : "Escreva um comentário..."
                }
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
