// src/app/(app)/design-editor/editor/ImagesPanel.tsx
"use client";

import React from "react";
import Image from "next/image";
import { useEditor } from "./store";
import { Button } from "@/components/ui/button";
import { X, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const BUCKET_NAME = "design-editor-canva-image";

// Spinner leve
function UILoader({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent ${className}`}
    />
  );
}

type ImageItem = {
  name: string;
  path: string;
  url: string;
};

type StorageListItem = { name: string };

// === Função utilitária para sanitizar nomes de arquivos ===
function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, "_"); // substitui inválidos por "_"
}

export default function ImagesPanel({ onClose }: { onClose: () => void }) {
  const { api } = useEditor();
  const [items, setItems] = React.useState<ImageItem[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // Busca orgId + userId
  const getOrgAndUser = async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) throw userErr ?? new Error("Usuário não autenticado");
    const userId = user.id;

    const { data: orgMember, error: orgErr } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();
    if (orgErr || !orgMember) throw orgErr ?? new Error("Org não encontrada");
    const orgId = orgMember.org_id;

    return { orgId, userId };
  };

  // Listagem
  const fetchImages = React.useCallback(async () => {
    setLoadingList(true);
    try {
      const { orgId, userId } = await getOrgAndUser();
      const prefix = `${orgId}/${userId}`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(prefix, { limit: 100 });

      if (error) throw error;

      const files: StorageListItem[] = (data ?? []).filter(
        (f: StorageListItem) => !f.name.startsWith(".")
      );

      const signed = await Promise.all(
        files.map(async (f: StorageListItem) => {
          const fullPath = `${prefix}/${f.name}`;
          const { data: signedData, error: signedErr } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(fullPath, 60 * 60);

          if (signedErr || !signedData) return null;

          return {
            name: f.name,
            path: fullPath,
            url: signedData.signedUrl,
          } as ImageItem;
        })
      );

      setItems((signed.filter(Boolean) as ImageItem[]) ?? []);
    } catch (e) {
      console.error("[ImagesPanel] fetchImages error:", e);
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  React.useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Upload
  const handlePickFile = () => fileRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const { orgId, userId } = await getOrgAndUser();

      const safeName = sanitizeFileName(file.name);
      const key = `${orgId}/${userId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(key, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (upErr) throw upErr;

      const { data: signedData, error: signedErr } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(key, 60 * 60);

      if (signedErr || !signedData) throw signedErr;

      setItems((prev) => [
        { name: safeName, path: key, url: signedData.signedUrl },
        ...prev,
      ]);
    } catch (e) {
      console.error("[ImagesPanel] upload error:", e);
    } finally {
      setUploading(false);
    }
  };

  // Inserir no Stage preservando proporção
  const handleInsert = (item: ImageItem) => {
    const img = new window.Image();
    img.onload = () => {
      api.addImage(item.url, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = item.url;
  };

  // Excluir
  const handleDelete = async (item: ImageItem) => {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([item.path]);

      if (error) throw error;

      setItems((prev) => prev.filter((img) => img.path !== item.path));
    } catch (e) {
      console.error("[ImagesPanel] delete error:", e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <h3 className="font-semibold">Imagens</h3>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />

          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={18} />
            <span className="sr-only">Fechar painel</span>
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="p-3 overflow-auto">
        <div className="pb-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handlePickFile}
            disabled={uploading}>
            {uploading ? (
              <UILoader className="mr-2" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload
          </Button>
        </div>
        {loadingList ? (
          <div className="flex items-center justify-center py-10 text-sm text-neutral-500">
            <UILoader className="mr-3" />
            Carregando imagens...
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-neutral-500 py-8 text-center">
            ainda nao possui imagens
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((img: ImageItem) => (
              <ThumbCard
                key={img.path}
                item={img}
                onInsert={handleInsert}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThumbCard({
  item,
  onInsert,
  onDelete,
}: {
  item: ImageItem;
  onInsert: (v: ImageItem) => void;
  onDelete: (v: ImageItem) => void;
}) {
  const [imgLoaded, setImgLoaded] = React.useState(false);

  return (
    <div className="group relative w-full h-24 overflow-hidden rounded-md border hover:shadow-sm transition">
      <button
        type="button"
        className="w-full h-24"
        onClick={() => onInsert(item)}
        title={`Inserir "${item.name}" no stage`}>
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50">
            <UILoader />
          </div>
        )}
        <div className="relative h-full w-full">
          <Image
            src={item.url}
            alt={item.name}
            fill
            sizes="150px"
            className={`object-contain bg-center transition ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoadingComplete={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            draggable={false}
          />
        </div>
      </button>

      {/* Botão excluir */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // não disparar insert
          onDelete(item);
        }}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
        title="Excluir imagem">
        <Trash2 size={14} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[11px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition">
        {item.name}
      </div>
    </div>
  );
}
