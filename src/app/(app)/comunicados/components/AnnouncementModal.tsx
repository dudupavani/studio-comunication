"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import { ANNOUNCEMENT_REACTIONS } from "@/lib/messages/announcement-entities";
import DOMPurify from "dompurify";
import UserSummary from "@/components/shared/user-summary";

type Props = {
  announcement: AnnouncementItem;
  children: ReactNode;
};

export default function AnnouncementModal({ announcement, children }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const myComment = announcement.comments?.find((c) => c.isMine);
  const [comment, setComment] = useState(myComment?.content ?? "");
  const [isPending, startTransition] = useTransition();
  const [reactionPending, setReactionPending] = useState(false);

  const sanitizedContent = useMemo(
    () =>
      DOMPurify.sanitize(
        announcement.fullContent ?? announcement.contentPreview ?? ""
      ),
    [announcement.contentPreview, announcement.fullContent]
  );

  useEffect(() => {
    setComment(myComment?.content ?? "");
  }, [myComment?.content]);

  const submitComment = () => {
    if (!announcement.allowComments) return;
    const trimmed = comment.trim();
    if (!trimmed) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[1000px] w-full h-screen p-0">
        <ScrollArea className="h-full">
          <div className="px-12 pt-12 pb-20 space-y-12">
            <div>
              <div className="mb-8 space-y-2">
                <h3 className="font-semibold">{announcement.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="p-1 rounded-md bg-muted">
                    <CalendarClock size={16} />
                  </div>
                  {new Date(announcement.createdAt).toLocaleString()}
                </div>
              </div>
              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: sanitizedContent,
                }}
              />
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-3 border-b border-border pb-8">
                <Avatar className="h-12 w-12">
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
                <div className="space-y-1">
                  <div className="font-semibold">
                    {announcement.senderName || "Remetente desconhecido"}
                  </div>
                </div>
              </div>

              {announcement.allowReactions ? (
                <div className="flex flex-wrap gap-2">
                  {(
                    announcement.reactions ??
                    ANNOUNCEMENT_REACTIONS.map((emoji) => ({
                      emoji,
                      count: 0,
                      reacted: false,
                    }))
                  ).map((reaction) => (
                    <Button
                      key={reaction.emoji}
                      type="button"
                      size="sm"
                      variant={reaction.reacted ? "default" : "outline"}
                      disabled={reactionPending}
                      onClick={() => toggleReaction(reaction.emoji)}>
                      <span className="mr-1">{reaction.emoji}</span>
                      <span>{reaction.count}</span>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            {announcement.allowComments ? (
              <div className="space-y-4">
                <div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    autoResize
                    minHeight={32}
                    maxHeight={240}
                    className="pr-16"
                  />
                  <div className="flex justify-end mt-2 relative">
                    <Button
                      type="button"
                      size="icon-md"
                      variant="secondary"
                      disabled={isPending}
                      className=" absolute right-2.5 bottom-4"
                      onClick={submitComment}>
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {announcement.comments && announcement.comments.length > 0 ? (
                    announcement.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-md border p-4 text-sm space-y-2">
                        <div className="flex items-start justify-between gap-3">
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
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="p-4 whitespace-pre-wrap text-sm text-foreground">
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
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
