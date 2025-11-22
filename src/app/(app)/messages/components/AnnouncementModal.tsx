"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import { ANNOUNCEMENT_REACTIONS } from "@/lib/messages/announcement-entities";

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
        `/api/messages/announcements/${announcement.announcementId}/comments`,
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
        `/api/messages/announcements/${announcement.announcementId}/reactions`,
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
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
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
              <div>
                <div className="font-semibold">
                  {announcement.senderName || "Remetente desconhecido"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(announcement.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {announcement.title}
              </h2>
              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: announcement.fullContent ?? announcement.contentPreview,
                }}
              />
            </div>

            {announcement.allowReactions ? (
              <div className="flex flex-wrap gap-2">
                {(announcement.reactions ??
                  ANNOUNCEMENT_REACTIONS.map((emoji) => ({
                    emoji,
                    count: 0,
                    reacted: false,
                  }))).map((reaction) => (
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

            {announcement.allowComments ? (
              <div className="space-y-4">
                <div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="min-h-[120px]"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
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
                          <span>
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
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
