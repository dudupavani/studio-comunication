// src/components/EmailCopy.tsx
"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  className?: string;
  size?: number; // opcional para ajustar tamanho do ícone
};

export default function EmailCopy({ email, className, size = 12 }: Props) {
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      toast({
        title: "Copiado",
      });
    } catch {
      toast({
        title: "Falha",
        description: "Não foi possível copiar o e-mail.",
        variant: "destructive",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      aria-label="Copiar e-mail"
      className={cn("h-6 w-6 text-gray-500", className)}>
      <Copy size={size} />
    </Button>
  );
}
