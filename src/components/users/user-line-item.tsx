// src/components/users/user-line-item.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import EmailCopy from "@/components/EmailCopy";
import { Checkbox } from "@/components/ui/checkbox";

export type UserLineItemProps = {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md"; // default: "md"
  orientation?: "inline" | "stacked"; // default: "inline"
  withCopy?: boolean; // default: true se houver email
  truncateEmail?: boolean; // default: true
  className?: string;

  checkbox?: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    ariaLabel?: string;
  };

  rightSlot?: React.ReactNode; // ações à direita (ex.: botão remover / badge)
  loading?: boolean; // renderiza skeleton quando true
};

export default function UserLineItem({
  id,
  name,
  email,
  avatarUrl,
  size = "md",
  orientation = "inline",
  withCopy,
  truncateEmail = true,
  className,
  checkbox,
  rightSlot,
  loading = false,
}: UserLineItemProps) {
  const showCopy = withCopy ?? Boolean(email);

  // ======== helpers ========
  function computeInitials(nameArg?: string | null, emailArg?: string | null) {
    const twoGraphemes = (s: string) => {
      // Usa Intl.Segmenter quando disponível para segmentar por grafemas
      try {
        // @ts-expect-error: Intl.Segmenter nem sempre tipado
        const seg = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
        const parts: string[] = [];
        for (const { segment } of seg.segment(s)) {
          parts.push(segment);
          if (parts.length >= 2) break;
        }
        return parts.join("");
      } catch {
        // Fallback simples por code points
        return Array.from(s).slice(0, 2).join("");
      }
    };

    const normalizeWs = (s: string) => s.trim().replace(/\s+/g, " ");

    const fromTokens = (s: string) => {
      const tokens = normalizeWs(s).split(" ").filter(Boolean);
      if (tokens.length === 0) return "";
      if (tokens.length === 1) return twoGraphemes(tokens[0]);
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      return twoGraphemes(first[0] + last[0]);
    };

    // 1) Tenta pelo nome
    if (nameArg && nameArg.trim()) {
      const candidate = fromTokens(nameArg);
      if (candidate) return candidate.toUpperCase();
    }

    // 2) Fallback pelo email (parte local)
    if (emailArg && emailArg.includes("@")) {
      const local = emailArg.split("@")[0].replace(/[._-]+/g, " ");
      const candidate = fromTokens(local);
      if (candidate) return candidate.toUpperCase();
    }

    // 3) Último recurso
    return "NN";
  }

  const initials = computeInitials(name, email);

  const sizeMap = {
    sm: { box: "h-8 w-8", text: "text-xs", name: "text-sm", email: "text-xs" },
    md: {
      box: "h-10 w-10",
      text: "text-sm",
      name: "text-sm font-semibold",
      email: "text-sm",
    },
  }[size];

  // Skeleton
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 w-full",
          className
        )}>
        <div className="flex items-center gap-3">
          {checkbox ? (
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          ) : null}
          <div
            className={cn("rounded-full bg-muted animate-pulse", sizeMap.box)}
          />
          <div className="space-y-1">
            <div className="h-3 w-36 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        {rightSlot ? (
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        ) : null}
      </div>
    );
  }

  // Content (nome + email)
  const nameNode = (
    <span className={cn(sizeMap.name)}>{name ?? "Sem nome"}</span>
  );

  const emailNode = email ? (
    <div className="flex items-center gap-1">
      <span
        className={cn("text-muted-foreground", truncateEmail && "truncate")}
        title={truncateEmail ? email : undefined}>
        {email}
      </span>
      {showCopy ? <EmailCopy email={email} /> : null}
    </div>
  ) : (
    <span className={cn("text-muted-foreground", sizeMap.email)}>—</span>
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 w-full",
        className
      )}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Checkbox opcional */}
        {checkbox ? (
          <Checkbox
            checked={checkbox.checked}
            onCheckedChange={(v) => checkbox.onCheckedChange(Boolean(v))}
            aria-label={checkbox.ariaLabel ?? "Selecionar usuário"}
          />
        ) : null}

        {/* Avatar */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name || email || "Avatar"}
            className={cn("rounded-full object-cover", sizeMap.box)}
          />
        ) : (
          <div
            className={cn(
              "rounded-full bg-muted text-foreground flex items-center justify-center select-none",
              sizeMap.box,
              sizeMap.text
            )}
            aria-hidden>
            {initials}
          </div>
        )}

        {/* Texto */}
        <div
          className={cn(
            "min-w-0",
            orientation === "stacked"
              ? "flex flex-col"
              : "flex flex-col md:flex-row md:items-center md:gap-2"
          )}>
          {nameNode}
          {orientation === "stacked" ? (
            <span className={cn(sizeMap.email)}>{emailNode}</span>
          ) : (
            <span className={cn(sizeMap.email)}>
              {/* no “inline” mostramos email ao lado em telas md+; em xs/sm ele naturalmente quebra pra baixo */}
              {emailNode}
            </span>
          )}
        </div>
      </div>

      {/* Slot à direita */}
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
