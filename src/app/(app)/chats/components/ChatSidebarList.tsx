"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChats } from "@/hooks/use-chats";
import { ChatListItem } from "./ChatListItem";

interface ChatSidebarListProps {
  activeChatId?: string;
  onSelect?: (chatId: string) => void;
}

export function ChatSidebarList({
  activeChatId,
  onSelect,
}: ChatSidebarListProps) {
  const router = useRouter();
  const { chats, loading, error, hasMore, loadMore, reload } = useChats();

  const handleSelect = useCallback(
    (chatId: string) => {
      if (onSelect) onSelect(chatId);
      else router.push(`/chats/${chatId}`);
    },
    [onSelect, router]
  );

  const content = useMemo(() => {
    if (loading && chats.length === 0) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-14 w-full animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      );
    }

    if (error && chats.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
          <div className="mt-3">
            <Button size="sm" variant="destructive" onClick={reload}>
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    if (chats.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          Você ainda não possui conversas.
        </div>
      );
    }

    return (
      <div className="flex flex-col h-svh overflow-y-auto">
        {chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            onSelect={handleSelect}
          />
        ))}

        {hasMore ? (
          <Button variant="ghost" size="sm" onClick={loadMore} className="mt-2">
            {loading ? (
              <span className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </span>
            ) : (
              "Carregar mais"
            )}
          </Button>
        ) : null}
      </div>
    );
  }, [
    activeChatId,
    chats,
    error,
    handleSelect,
    hasMore,
    loadMore,
    loading,
    reload,
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5 border-b border-border">
        <h4>Conversas</h4>
      </div>
      <div>{content}</div>
    </div>
  );
}
