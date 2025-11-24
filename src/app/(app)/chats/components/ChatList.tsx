"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { ChatSummary, UserMini } from "@/lib/messages/types";

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
  const [sortKey, setSortKey] = useState<"name" | "created_at" | "creator">(
    "created_at"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [identityMap, setIdentityMap] = useState<
    Partial<Record<string, UserMini>>
  >({});
  const requestedIdentities = useRef<Set<string>>(new Set());

  const handleSelect = useCallback(
    (chatId: string) => {
      if (onSelect) onSelect(chatId);
      else router.push(`/chats/${chatId}`);
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
        const av = getCreatorName(
          a,
          resolveCreatorIdentity(a, identityMap)
        ).toLowerCase();
        const bv = getCreatorName(
          b,
          resolveCreatorIdentity(b, identityMap)
        ).toLowerCase();
        compare = av.localeCompare(bv);
      }
      return sortDir === "asc" ? compare : -compare;
    });
  }, [chats, identityMap, sortDir, sortKey]);

  useEffect(() => {
    const missingSet = new Set<string>();
    chats.forEach((chat) => {
      const creatorId = chat.created_by;
      if (!creatorId) return;
      const hasServerIdentity =
        Boolean(chat.creator?.full_name) ||
        Boolean(chat.creator?.email) ||
        Boolean(chat.creator?.avatar_url);
      if (hasServerIdentity) return;
      const cached = identityMap[creatorId];
      const hasCachedIdentity =
        Boolean(cached?.full_name) ||
        Boolean(cached?.email) ||
        Boolean(cached?.avatar_url);
      if (hasCachedIdentity) return;
      if (requestedIdentities.current.has(creatorId)) return;
      missingSet.add(creatorId);
    });

    const missing = Array.from(missingSet);
    if (!missing.length) {
      return;
    }

    missing.forEach((id) => requestedIdentities.current.add(id));
    let canceled = false;

    const resolveIdentities = async () => {
      try {
        const res = await fetch("/api/identity/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: missing }),
        });

        if (!res.ok) {
          throw new Error(`Falha ao resolver identidades (${res.status})`);
        }

        const payload = (await res.json()) as {
          byId?: Record<
            string,
            {
              user_id: string;
              full_name: string | null;
              email: string | null;
              avatar_url: string | null;
            }
          >;
        };

        if (canceled) return;

        setIdentityMap((prev) => {
          const next = { ...prev };
          Object.values(payload.byId ?? {}).forEach((identity) => {
            next[identity.user_id] = {
              id: identity.user_id,
              full_name: identity.full_name,
              email: identity.email,
              avatar_url: identity.avatar_url,
            };
          });
          return next;
        });
      } catch (err) {
        console.error("Erro ao carregar identidades de criadores", err);
        missing.forEach((id) => requestedIdentities.current.delete(id));
      }
    };

    resolveIdentities();

    return () => {
      canceled = true;
    };
  }, [chats, identityMap]);

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
      const resolvedCreator = resolveCreatorIdentity(chat, identityMap);
      const creatorName = getCreatorName(chat, resolvedCreator);
      const creatorAvatar = getCreatorAvatar(chat, resolvedCreator);
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
                  src={creatorAvatar ?? undefined}
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
  }, [
    activeChatId,
    chats,
    error,
    handleSelect,
    identityMap,
    loading,
    reload,
    sortedChats,
  ]);

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

function resolveCreatorIdentity(
  chat: ChatSummary,
  map: Partial<Record<string, UserMini>>
) {
  if (chat.created_by && map[chat.created_by]) {
    return map[chat.created_by];
  }
  return chat.creator ?? null;
}

function getCreatorName(chat: ChatSummary, identity?: UserMini | null) {
  const source = identity ?? chat.creator ?? null;
  return (
    source?.full_name?.trim() ||
    source?.email?.trim() ||
    chat.created_by ||
    "Usuário"
  );
}

function getCreatorAvatar(chat: ChatSummary, identity?: UserMini | null) {
  const source = identity ?? chat.creator ?? null;
  return source?.avatar_url || (chat.creator as any)?.avatarUrl || null;
}

function getInitials(value: string) {
  if (!value) return "U";
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}
