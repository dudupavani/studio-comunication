"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Attachment = {
  name: string;
  path: string;
  size: number;
  mime: string;
  url?: string | null;
  created_at?: string;
};

interface Props {
  chatId: string;
  refreshToken?: number;
}

export function ChatAttachmentsPanel({ chatId, refreshToken }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    fetch(`/api/messages/chats/${chatId}/attachments`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message || `Erro ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (aborted) return;
        setAttachments(Array.isArray(payload?.attachments) ? payload.attachments : []);
      })
      .catch((err) => {
        if (aborted) return;
        setError(err?.message ?? "Falha ao carregar anexos");
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [chatId, refreshToken]);

  const images = useMemo(
    () => attachments.filter((att) => typeof att.mime === "string" && att.mime.startsWith("image/")),
    [attachments]
  );
  const others = useMemo(
    () => attachments.filter((att) => !(typeof att.mime === "string" && att.mime.startsWith("image/"))),
    [attachments]
  );

  return (
    <div className="flex h-full flex-col gap-4 px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Anexos</h2>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {!loading && attachments.length === 0 && !error ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          Nenhum anexo neste chat.
        </div>
      ) : null}

      {images.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Imagens</h3>
          <div className="grid grid-cols-2 gap-3">
            {images.map((att) => (
              <a
                key={att.path}
                href={att.url ?? att.path}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-lg border bg-muted/30"
              >
                <img
                  src={att.url ?? undefined}
                  alt={att.name}
                  className="h-28 w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[11px] text-white">
                  <div className="truncate">{att.name}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {others.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Outros arquivos</h3>
          <div className="space-y-2">
            {others.map((att) => (
              <a
                key={`${att.path}-other`}
                href={att.url ?? att.path}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition hover:bg-muted",
                  "border-border"
                )}
              >
                <div className="flex-1 truncate">
                  <div className="truncate font-medium text-foreground">{att.name || "Anexo"}</div>
                  {att.size ? (
                    <div className="text-[11px] text-muted-foreground">
                      {(att.size / 1024).toFixed(1)} KB
                    </div>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
