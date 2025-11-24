"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useChats } from "@/hooks/use-chats";
import type { ChatFilters } from "./ChatFiltersPanel";
import type { ChatSummary } from "@/lib/messages/types";

interface ChatListProps {
  activeChatId?: string;
  onSelect?: (chatId: string) => void;
  filters?: ChatFilters;
}

export function ChatList({ activeChatId, onSelect, filters }: ChatListProps) {
  const router = useRouter();
  const { chats, loading, error, hasMore, loadMore, reload } = useChats({
    filters,
  });
  const [sortKey, setSortKey] =
    useState<"name" | "created_at" | "creator">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSelect = useCallback(
    (chatId: string) => {
      if (onSelect) onSelect(chatId);
      else router.push(`/messages/${chatId}`);
    },
    [onSelect, router]
  );

  const handleSort = useCallback(
    (key: "name" | "created_at" | "creator") => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortedChats = useMemo(() => {
    if (chats.length === 0) return chats;
    return [...chats].sort((a, b) => {
      let compare = 0;
      if (sortKey === "created_at") {
        compare =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === "name") {
        const av = (a[sortKey] || "").toString().toLowerCase();
        const bv = (b[sortKey] || "").toString().toLowerCase();
        compare = av.localeCompare(bv);
      } else {
        const av = getCreatorName(a).toLowerCase();
        const bv = getCreatorName(b).toLowerCase();
        compare = av.localeCompare(bv);
      }
      return sortDir === "asc" ? compare : -compare;
    });
  }, [chats, sortDir, sortKey]);

  const tableContent = useMemo(() => {
    if (loading && chats.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3}>
            <div className="flex flex-col gap-3 py-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-6 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error && chats.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3}>
            <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
              {error}
              <div className="mt-3">
                <Button size="sm" variant="destructive" onClick={reload}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (chats.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3}>
            <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa ainda. Clique em “Nova mensagem”.
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return sortedChats.map((chat) => {
      const creatorName = getCreatorName(chat);
      return (
        <TableRow
          key={chat.id}
          onClick={() => handleSelect(chat.id)}
          className={cn(
            "cursor-pointer",
            chat.id === activeChatId && "bg-primary/5"
          )}>
          <TableCell className="font-medium">
            {chat.name || "Conversa"}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={getCreatorAvatar(chat) ?? undefined}
                  alt={creatorName}
                />
                <AvatarFallback>{getInitials(creatorName)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{creatorName}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {new Date(chat.created_at).toLocaleString()}
          </TableCell>
        </TableRow>
      );
    });
  }, [activeChatId, chats, error, handleSelect, loading, reload, sortedChats]);

  const renderSortIcon = useCallback(
    (key: "name" | "created_at" | "creator") => {
      if (sortKey !== key) return <ArrowUpDown className="h-4 w-4" />;
      return sortDir === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    },
    [sortDir, sortKey]
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex-1 overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1">
                  Chat
                  {renderSortIcon("name")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("creator")}
                  className="flex items-center gap-1">
                  Criado por
                  {renderSortIcon("creator")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("created_at")}
                  className="flex items-center gap-1">
                  Criado em
                  {renderSortIcon("created_at")}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{tableContent}</TableBody>
        </Table>
      </div>

      {hasMore && (
        <Button onClick={loadMore} variant="secondary" className="mt-2">
          Carregar mais
        </Button>
      )}

      {loading && chats.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      )}
    </div>
  );
}

function getCreatorName(chat: ChatSummary) {
  return (
    chat.creator?.full_name?.trim() ||
    chat.creator?.email?.trim() ||
    chat.created_by ||
    "Usuário"
  );
}

function getCreatorAvatar(chat: ChatSummary) {
  return (
    chat.creator?.avatar_url ||
    (chat.creator as any)?.avatarUrl ||
    null
  );
}

function getInitials(value: string) {
  if (!value) return "U";
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}
