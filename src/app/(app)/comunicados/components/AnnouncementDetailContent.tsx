"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { AnnouncementItem } from "@/lib/messages/announcement-entities";
import UserSummary from "@/components/shared/user-summary";
import { AnnouncementMetricsPanel } from "./AnnouncementMetricsPanel";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/utils/sanitize";

type Props = {
  announcement: AnnouncementItem;
  canInteract: boolean;
  canViewMetrics: boolean;
  trackView?: boolean;
};

export function AnnouncementDetailContent({
  announcement,
  canInteract,
  canViewMetrics,
  trackView = true,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [reactionPending, setReactionPending] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [activeTab, setActiveTab] = useState<"content" | "metrics">("content");
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (!trackView || !canInteract || hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;

    void fetch(`/api/comunicados/${announcement.announcementId}/views`, {
      method: "POST",
    }).catch((err) => {
      console.warn("ANNOUNCEMENT view track error", err);
    });
  }, [announcement.announcementId, canInteract, trackView]);

  useEffect(() => {
    setComment("");
  }, [announcement.announcementId]);

  const sanitizedContent = useMemo(
    () =>
      sanitizeHtml(
        announcement.fullContent ?? announcement.contentPreview ?? ""
      ),
    [announcement.contentPreview, announcement.fullContent]
  );

  const isScheduled = announcement.status === "scheduled";
  const commentCount = announcement.comments?.length ?? 0;
  const displayDate =
    announcement.publishedAt ??
    (isScheduled ? announcement.sendAt : announcement.sentAt) ??
    announcement.createdAt;
  const showInteractionSection =
    canInteract && (announcement.allowReactions || announcement.allowComments);

  const submitComment = () => {
    if (!canInteract || !announcement.allowComments) return;
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

  const toggleReaction = async () => {
    if (!canInteract || !announcement.allowReactions || reactionPending) return;
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
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1>{announcement.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{new Date(displayDate).toLocaleString()}</span>
            {isScheduled ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Agendado
              </span>
            ) : null}
          </div>
        </div>

        {announcement.media?.kind === "image" ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={announcement.media.url}
              alt={announcement.title}
              className="h-auto max-h-[520px] w-full object-cover"
            />
          </div>
        ) : null}

        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>

      <div className="space-y-6 border-t border-border pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <UserSummary
            avatarUrl={announcement.senderAvatar}
            name={announcement.senderName || "Remetente desconhecido"}
            subtitle={announcement.senderTitle ?? undefined}
            fallback="Remetente"
          />
          {isScheduled && announcement.sendAt ? (
            <div className="text-xs text-muted-foreground text-right">
              Envio agendado para {new Date(announcement.sendAt).toLocaleString()}
            </div>
          ) : null}
        </div>

        {canInteract && canViewMetrics ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab((value as "content" | "metrics") ?? "content")
            }
            className="space-y-4">
            <TabsList className="justify-start gap-2">
              <TabsTrigger value="content">Interações</TabsTrigger>
              <TabsTrigger value="metrics">Métricas</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {showInteractionSection ? (
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
                        onClick={toggleReaction}
                        className="px-2">
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

              {canInteract && announcement.allowComments && showComments ? (
                <div className="w-full rounded-xl border border-gray-200 bg-muted p-3 sm:p-4 md:p-6">
                  <div className="space-y-3">
                    {(announcement.comments ?? []).map((commentItem) => (
                      <div
                        key={commentItem.id}
                        className="rounded-xl border bg-white p-4 text-sm space-y-4 sm:space-y-2">
                        <div className="flex flex-col-reverse items-start justify-between gap-1 sm:gap-3">
                          <UserSummary
                            avatarUrl={commentItem.authorAvatar}
                            name={
                              commentItem.authorName
                                ? commentItem.isMine
                                  ? `${commentItem.authorName} (você)`
                                  : commentItem.authorName
                                : "Usuário"
                            }
                            subtitle={commentItem.authorTitle ?? undefined}
                            fallback="Usuário"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(commentItem.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">
                          {commentItem.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-4 flex w-full">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Escreva um comentário..."
                      autoResize
                      minHeight={32}
                      maxHeight={240}
                      className="min-h-[40px] bg-card pr-16 text-sm"
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
            </TabsContent>

            <TabsContent value="metrics">
              {activeTab === "metrics" ? (
                <AnnouncementMetricsPanel
                  announcementId={announcement.announcementId}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        ) : canInteract ? (
          <div className="space-y-4">
            {showInteractionSection ? (
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
                      onClick={toggleReaction}
                      className="px-2">
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

            {announcement.allowComments && showComments ? (
              <div className="w-full rounded-xl border border-border bg-muted/50 p-3 sm:p-4 md:p-6">
                <div className="space-y-3">
                  {(announcement.comments ?? []).map((commentItem) => (
                    <div
                      key={commentItem.id}
                      className="rounded-xl border border-border bg-card p-4 text-sm space-y-4 sm:space-y-2">
                      <div className="flex flex-col-reverse items-start justify-between gap-1 sm:gap-3">
                        <UserSummary
                          avatarUrl={commentItem.authorAvatar}
                          name={
                            commentItem.authorName
                              ? commentItem.isMine
                                ? `${commentItem.authorName} (você)`
                                : commentItem.authorName
                              : "Usuário"
                          }
                          subtitle={commentItem.authorTitle ?? undefined}
                          fallback="Usuário"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(commentItem.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">
                        {commentItem.content}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="relative mt-4 flex w-full">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    autoResize
                    minHeight={32}
                    maxHeight={240}
                    className="min-h-[40px] bg-white pr-16 text-sm"
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
        ) : canViewMetrics ? (
          <AnnouncementMetricsPanel announcementId={announcement.announcementId} />
        ) : null}
      </div>
    </div>
  );
}
 </div>
  );
}
