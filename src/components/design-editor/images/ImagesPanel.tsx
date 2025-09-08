// src/components/design-editor/images/ImagesPanel.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ARTBOARD_BUCKET,
  uploadArtboardImage,
  createArtboardSignedUrl,
} from "@/lib/storage/artboard-images";
import { X as IconX, ImageUp } from "lucide-react";

type Props = {
  orgId: string;
  userId: string;
  /** Chamado quando o usuário clicar numa miniatura para inserir no Canvas (mantido p/ compat). */
  onInsert?: (payload: { url: string; path: string }) => void;
  /** Altura máxima do painel (opcional) */
  maxHeight?: number;
};

type ImageItem = {
  name: string; // filename (ex: 1234.png)
  path: string; // orgId/userId/1234.png
  url?: string; // signed url
};

export default function ImagesPanel({
  orgId,
  userId,
  onInsert,
  maxHeight = 360,
}: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prefix = useMemo(() => `${orgId}/${userId}`, [orgId, userId]);

  const refreshSignedUrls = useCallback(async (list: ImageItem[]) => {
    const refreshed: ImageItem[] = [];
    for (const it of list) {
      try {
        const url = await createArtboardSignedUrl(it.path, 60 * 30); // 30 min
        refreshed.push({ ...it, url });
      } catch (e: any) {
        console.error("signedUrl error:", e?.message || e);
        refreshed.push({ ...it, url: undefined });
      }
    }
    setItems(refreshed);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (await import("@/lib/supabase/client"))
        .createClient()
        .storage.from(ARTBOARD_BUCKET)
        .list(prefix, { limit: 100 });

      if (error) throw new Error(error.message);
      const list: ImageItem[] = (data ?? [])
        .filter((f) => f && f.name && !f.metadata?.isDirectory)
        .map((f) => ({
          name: f.name,
          path: `${prefix}/${f.name}`,
        }));

      await refreshSignedUrls(list);
    } catch (e: any) {
      toast({
        title: "Falha ao listar imagens",
        description: e?.message ?? "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [prefix, refreshSignedUrls, toast]);

  // Carrega ao montar
  useEffect(() => {
    loadList();
  }, [loadList]);

  // Revalidações automáticas: foco/visibilidade da aba + renovação periódica das URLs
  const lastFetchAtRef = useRef(0);
  const refreshIfStale = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchAtRef.current < 3000) return; // mínimo 3s entre auto-calls
    lastFetchAtRef.current = now;
    loadList();
  }, [loadList]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    const onFocus = () => refreshIfStale();

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    // A cada 10 min, renova apenas as URLs assinadas
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && items.length > 0) {
        refreshSignedUrls(items);
      }
    }, 10 * 60 * 1000);

    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [items, refreshIfStale, refreshSignedUrls]);

  const onFilesChosen = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await uploadArtboardImage(file, orgId, userId);
        }
        toast({
          title: "Upload concluído",
          description: "Imagens enviadas com sucesso.",
        });
        await loadList();
      } catch (e: any) {
        toast({
          title: "Falha no upload",
          description: e?.message ?? "Erro desconhecido.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [orgId, userId, toast, loadList]
  );

  // Remover item (thumbnail) — com confirmação e checagem de prefixo
  const handleRemoveItem = useCallback(
    async (it: ImageItem) => {
      try {
        if (!it?.path) return;
        const expectedPrefix = `${prefix}/`;
        if (!it.path.startsWith(expectedPrefix)) {
          toast({
            title: "Remoção bloqueada",
            description: "Caminho fora do escopo permitido.",
            variant: "destructive",
          });
          return;
        }

        const ok = window.confirm(
          `Remover esta imagem do armazenamento?\n${it.name}`
        );
        if (!ok) return;

        // UI otimista
        setItems((prev) => prev.filter((p) => p.path !== it.path));

        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { error } = await supabase.storage
          .from(ARTBOARD_BUCKET)
          .remove([it.path]);

        if (error) {
          // rollback
          setItems((prev) => {
            const exists = prev.some((p) => p.path === it.path);
            return exists ? prev : [...prev, it];
          });
          throw new Error(error.message);
        }

        // Revalida lista para garantir consistência
        await loadList();
        toast({ title: "Imagem removida" });
      } catch (e: any) {
        toast({
          title: "Falha ao remover imagem",
          description: e?.message ?? "Erro desconhecido.",
          variant: "destructive",
        });
      }
    },
    [prefix, toast, loadList]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFilesChosen(e.currentTarget.files)}
        />
        <div className="mb-2">
          <Button
            size="default"
            variant="secondary"
            className="w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}>
            <ImageUp size={18} className="mr-1" />
            {uploading ? "Enviando..." : "Upload"}
          </Button>
        </div>
      </div>

      {/* Grid de miniaturas (usa signed URLs) */}
      <div
        className="grid grid-cols-2 gap-2 overflow-auto pr-1"
        style={{ maxHeight }}>
        {items.length === 0 && !loading && (
          <div className="col-span-2 text-center text-xs text-muted-foreground">
            Nenhuma imagem enviada ainda.
          </div>
        )}

        {items.map((it) => (
          <div
            key={it.path}
            className="group relative aspect-square overflow-hidden rounded-md border border-gray-100 hover:shadow-lg"
            title="Clique para inserir na Artboard"
            role="button"
            tabIndex={0}
            onClick={async () => {
              try {
                let url = it.url;
                // Fallback: se a URL estiver expirada/ausente, renova só deste item
                if (!url) {
                  url = await createArtboardSignedUrl(it.path, 60 * 30);
                  setItems((prev) =>
                    prev.map((p) => (p.path === it.path ? { ...p, url } : p))
                  );
                }
                if (!url) {
                  toast({
                    title: "Não foi possível abrir a imagem",
                    description: "Tente novamente em alguns segundos.",
                    variant: "destructive",
                  });
                  return;
                }

                // Callback de compatibilidade + evento global usado pelo Canvas
                onInsert?.({ url, path: it.path });
                window.dispatchEvent(
                  new CustomEvent("design-editor:insert-image", {
                    detail: { url, path: it.path },
                  })
                );
              } catch (e: any) {
                toast({
                  title: "Falha ao preparar imagem",
                  description: e?.message ?? "Erro desconhecido.",
                  variant: "destructive",
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                (e.currentTarget as HTMLDivElement).click();
              }
            }}>
            {it.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.url}
                alt={it.name || ""}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                gerando link…
              </div>
            )}

            {/* Botão remover — só aparece no hover */}
            <button
              aria-label="Remover imagem"
              title="Remover do armazenamento"
              className="absolute left-1 top-1 h-5 w-5 rounded bg-red-500 text-white opacity-0 transition group-hover:opacity-100 flex items-center justify-center hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation(); // não inserir
                handleRemoveItem(it);
              }}>
              <IconX className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
