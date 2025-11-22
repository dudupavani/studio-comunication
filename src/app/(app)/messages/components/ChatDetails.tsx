"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ChatDetailsProps {
  chat: Chat;
  chatId: string;
  canManageMembers: boolean;
  members: ChatMemberWithUser[];
  onMembersChange?: (members: ChatMemberWithUser[]) => void;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  const refreshMembers = useCallback(async () => {
    const res = await fetch(`/api/messages/chats/${chatId}/members`);
    if (!res.ok) return;
    const payload = (await res.json().catch(() => null)) as {
      members: ChatMemberWithUser[];
    } | null;
    if (payload?.members) {
      setLocalMembers(payload.members);
      onMembersChange?.(payload.members);
    }
  }, [chatId, onMembersChange]);

  const handleAdd = useCallback(async () => {
    const userId = window.prompt(
      "Informe o ID do usuário para adicionar ao chat"
    );
    if (!userId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/messages/chats/${chatId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "member" }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as any;
        toast({
          title: "Não foi possível adicionar",
          description: body?.error?.message || "Verifique o ID informado.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Membro adicionado" });
      refreshMembers();
    } catch (err: any) {
      console.error("add member error", err);
      toast({
        title: "Erro ao adicionar",
        description: err?.message ?? "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chatId, refreshMembers, toast]);

  return (
    <aside className="flex h-full flex-col gap-4 border-l border-border bg-background px-5 py-4">
      <div>
        <h2 className="text-base font-semibold">Detalhes</h2>
        <p className="text-xs text-muted-foreground">
          Informações sobre a conversa e participantes.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Participantes</h3>
          {canManageMembers ? (
            <Button
              size="icon"
              variant="ghost"
              title="Adicionar membro"
              onClick={handleAdd}
              disabled={loading}>
              <UserPlus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <ul className="space-y-2">
          {localMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.user?.full_name?.trim() ||
                    member.user?.email?.trim() ||
                    "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.role === "admin" ? "Administrador" : "Membro"}
                </p>
              </div>
            </li>
          ))}
          {localMembers.length === 0 ? (
            <li className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Nenhum participante.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-auto space-y-2 rounded-2xl border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Notas internas
        </h3>
        <p className="text-xs text-muted-foreground">
          Espaço reservado para futuras anotações da equipe. Em breve ✨
        </p>
      </section>
    </aside>
  );
}
