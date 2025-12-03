"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  UserMultiSelect,
  type UserOption,
} from "@/components/communication/UserMultiSelect";

interface ChatDetailsProps {
  chat: Chat;
  chatId: string;
  canManageMembers: boolean;
  members: ChatMemberWithUser[];
  onMembersChange?: (members: ChatMemberWithUser[]) => void;
}

function resolveMemberName(member: ChatMemberWithUser) {
  return (
    member.user?.full_name?.trim() || member.user?.email?.trim() || "Usuário"
  );
}

function initialsFromName(value: string) {
  if (!value) return "U";
  const trimmed = value.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "U";
}

export function ChatDetails({
  chat,
  chatId,
  members,
  canManageMembers,
  onMembersChange,
}: ChatDetailsProps) {
  const { toast } = useToast();
  const [localMembers, setLocalMembers] =
    useState<ChatMemberWithUser[]>(members);
  const [panelMode, setPanelMode] = useState<"view" | "addMembers">("view");
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const duplicateToastRef = useRef(false);

  useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  const refreshMembers = useCallback(async () => {
    const res = await fetch(`/api/chats/${chatId}/members`);
    if (!res.ok) return;
    const payload = (await res.json().catch(() => null)) as {
      members: ChatMemberWithUser[];
    } | null;
    if (payload?.members) {
      setLocalMembers(payload.members);
      onMembersChange?.(payload.members);
    }
  }, [chatId, onMembersChange]);

  const existingMemberIds = useMemo(
    () => new Set(localMembers.map((member) => member.user_id)),
    [localMembers]
  );

  const handleStartAdd = useCallback(() => {
    duplicateToastRef.current = false;
    setSelectedUsers([]);
    setPanelMode("addMembers");
  }, []);

  const handleCancelAdd = useCallback(() => {
    if (savingMembers) return;
    setSelectedUsers([]);
    setPanelMode("view");
  }, [savingMembers]);

  const handleSelectedUsersChange = useCallback(
    (users: UserOption[]) => {
      const filtered = users.filter((user) => !existingMemberIds.has(user.id));
      if (filtered.length !== users.length && !duplicateToastRef.current) {
        toast({
          title: "Participante já adicionado",
          description:
            "Usuários que já fazem parte da conversa não podem ser selecionados novamente.",
        });
        duplicateToastRef.current = true;
      }
      setSelectedUsers(filtered);
    },
    [existingMemberIds, toast]
  );

  const handleConfirmAdd = useCallback(async () => {
    const pending = selectedUsers.filter(
      (user) => !existingMemberIds.has(user.id)
    );

    if (!pending.length) {
      toast({
        title: "Selecione participantes",
        description:
          "Escolha usuários que ainda não fazem parte desta conversa.",
      });
      return;
    }

    setSavingMembers(true);
    try {
      for (const user of pending) {
        const res = await fetch(`/api/chats/${chatId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, role: "member" }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(
            body?.error?.message || "Não foi possível adicionar o usuário."
          );
        }
      }

      toast({ title: "Participantes adicionados" });
      await refreshMembers();
      setSelectedUsers([]);
      setPanelMode("view");
    } catch (err: any) {
      console.error("add members error", err);
      toast({
        title: "Erro ao adicionar participantes",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingMembers(false);
    }
  }, [chatId, existingMemberIds, refreshMembers, selectedUsers, toast]);

  const handleRemoveMember = useCallback(
    async (member: ChatMemberWithUser) => {
      const displayName = resolveMemberName(member);
      const confirmed = window.confirm(
        `Remover ${displayName} desta conversa?`
      );
      if (!confirmed) return;
      setRemovingMemberId(member.user_id);
      try {
        const res = await fetch(`/api/chats/${chatId}/members`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: member.user_id }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(
            body?.error?.message || "Não foi possível remover o usuário."
          );
        }

        toast({ title: "Participante removido" });
        await refreshMembers();
      } catch (err: any) {
        console.error("remove member error", err);
        toast({
          title: "Erro ao remover participante",
          description: err?.message ?? "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setRemovingMemberId(null);
      }
    },
    [chatId, refreshMembers, toast]
  );

  return (
    <aside className="flex h-full flex-col gap-4 border-l border-border bg-background px-4 py-4">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4>
            Participantes{" "}
            <span className="text-muted-foreground">
              ({localMembers.length})
            </span>
          </h4>
          {canManageMembers ? (
            <Button
              size="icon"
              variant="ghost"
              title="Adicionar participante"
              onClick={handleStartAdd}
              disabled={panelMode === "addMembers"}>
              <UserPlus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        {panelMode === "view" ? (
          <ul className="space-y-2">
            {localMembers.map((member) => {
              const displayName = resolveMemberName(member);
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between group hover:bg-muted hover:border-gray-500 transition rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.user?.avatar_url ?? undefined}
                        alt={displayName}
                      />
                      <AvatarFallback>
                        {initialsFromName(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.role === "admin" ? "Administrador" : "Membro"}
                      </p>
                    </div>
                  </div>
                  {canManageMembers ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="group-hover:opacity-100 opacity-0"
                      onClick={() => handleRemoveMember(member)}
                      title="Remover participante"
                      aria-label={`Remover ${displayName}`}
                      disabled={removingMemberId === member.user_id}>
                      {removingMemberId === member.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                </li>
              );
            })}
            {localMembers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                Nenhum participante.
              </li>
            ) : null}
          </ul>
        ) : (
          <div>
            <div className="space-y-1">
              <h5 className="mb-2">Adicionar participantes</h5>
            </div>
            <UserMultiSelect
              value={selectedUsers}
              onChange={handleSelectedUsersChange}
            />
            <p className="text-xs mt-2 text-muted-foreground">
              Usuários que já participam da conversa são ignorados
              automaticamente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelAdd}
                disabled={savingMembers}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAdd}
                disabled={savingMembers || selectedUsers.length === 0}>
                {savingMembers ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adicionando
                  </span>
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
