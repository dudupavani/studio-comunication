// src/components/users/invite-magic-link.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

export default function InviteMagicLink() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/users/invite-magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok)
        throw new Error(payload?.error || `Falha (HTTP ${res.status})`);
      toast({
        title: "Convite enviado",
        description: "Enviamos um Magic Link para o e-mail informado.",
      });
      setEmail("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao convidar",
        description: err?.message ?? "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onInvite} className="flex gap-2">
      <Input
        type="email"
        placeholder="email@dominio.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Enviando..." : "Enviar convite"}
      </Button>
    </form>
  );
}
