"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CalendarClock, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import DOMPurify from "dompurify";
import UserSummary from "@/components/shared/user-summary";
import { cn } from "@/lib/utils";

type Props = {
  announcement: AnnouncementItem;
  children: ReactNode;
};

export default function AnnouncementModal({ announcement, children }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [reactionPending, setReactionPending] = useState(false);
  const [showComments, setShowComments] = useState(true);

  const sanitizedContent = useMemo(
    () =>
      DOMPurify.sanitize(
        announcement.fullContent ?? announcement.contentPreview ?? ""
      ),
    [announcement.contentPreview, announcement.fullContent]
  );
  const isScheduled = announcement.status === "scheduled";
  const commentCount = announcement.comments?.length ?? 0;

  useEffect(() => {
    setComment("");
  }, [announcement.announcementId, open]);

  const submitComment = () => {
    if (!announcement.allowComments) return;
    const trimmed = comment.trim();
    if (!trimmed) {
      toast({ title: "Comentário vazio", variant: "destructive" });
      return;
    }
    const submit = async () => {
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
    };
    startTransition(() => {
      void submit();
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
      <DialogContent className="max-w-none w-full h-screen p-0 rounded-none flex justify-center">
        <ScrollArea className="h-full">
          <div className="max-w-4xl px-4 sm:px-12 pt-12 pb-20 space-y-12">
            <div>
              <div className="mt-3 sm:mt-0 mb-8 space-y-2">
                <h4 className="text-lg sm:text-xl md:text-2xl font-semibold">
                  {announcement.title}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="p-1 rounded-md bg-muted">
                    <CalendarClock size={16} />
                  </div>
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
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizedContent,
                }}
              />
            </div>

            <div className="space-y-8">
              <div className="flex items-start justify-between border-b border-border pb-8">
                <UserSummary
                  avatarUrl={announcement.senderAvatar}
                  name={announcement.senderName || "Remetente desconhecido"}
                  subtitle={announcement.senderTitle ?? undefined}
                  fallback="Remetente"
                />
                {isScheduled && announcement.sendAt ? (
                  <div className="text-xs text-muted-foreground text-right">
                    Envio agendado para{" "}
                    {new Date(announcement.sendAt).toLocaleString()}
                  </div>
                ) : null}
              </div>

              {announcement.allowReactions || announcement.allowComments ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {announcement.allowReactions ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          announcement.reactions?.[0]?.reacted
                            ? "secondary"
                            : "outline"
                        }
                        disabled={reactionPending}
                        onClick={() => toggleReaction("👍")}>
                        <span className="mr-0 text-base sm:text-lg">👍</span>
                        {announcement.reactions?.[0]?.count ? (
                          <span>{announcement.reactions[0].count}</span>
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
            </div>

            {announcement.allowComments && showComments ? (
              <div className="space-y-4 border-t border-border pt-6">
                <div className="space-y-2">
                  {commentCount > 0
                    ? announcement.comments!.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-xl border p-4 text-sm space-y-4 sm:space-y-2 bg-background">
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
                    autoResize
                    minHeight={32}
                    maxHeight={240}
                    className="min-h-[40px] text-sm pr-16"
                  />
                  <div className="absolute right-2 bottom-2">
                    <Button
                      type="button"
                      size="icon-md"
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
