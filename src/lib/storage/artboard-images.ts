// src/lib/storage/artboard-images.ts
import type { SupabaseClient } from "@supabase/supabase-js";
// Ajuste o import abaixo conforme seu projeto.
// Geralmente temos "@/lib/supabase/client"
import { createClient } from "@/lib/supabase/client";

export const ARTBOARD_BUCKET = "design-editor-canva-image";

// Alinhado às restrições do bucket (20 MB e mimes permitidos)
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function validateImageFile(file: File) {
  if (!ALLOWED_MIMES.has(file.type)) {
    throw new Error(
      `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, GIF ou WEBP.`
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Arquivo maior que o limite: ${(file.size / 1024 / 1024).toFixed(
        2
      )}MB (máx. 20MB)`
    );
  }
}

function extFromFile(file: File): string {
  // prioriza MIME; fallback para extensão do nome
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  if (map[file.type]) return map[file.type];
  const n = file.name.toLowerCase();
  const dot = n.lastIndexOf(".");
  return dot > -1 ? n.slice(dot + 1) : "bin";
}

export function buildArtboardImagePath(
  orgId: string,
  userId: string,
  ext: string
) {
  // prefixo exigido pelas policies: {orgId}/{userId}/...
  const id = crypto.randomUUID();
  return `${orgId}/${userId}/${id}.${ext}`;
}

/**
 * Upload direto no Storage (bucket privado, RLS ativo)
 * Retorna o path (para gerar URL assinada depois).
 */
export async function uploadArtboardImage(
  file: File,
  orgId: string,
  userId: string,
  opts?: {
    supabase?: SupabaseClient;
    cacheControl?: string;
  }
) {
  validateImageFile(file);
  const supabase = opts?.supabase ?? createClient();
  const ext = extFromFile(file);
  const path = buildArtboardImagePath(orgId, userId, ext);

  const { error } = await supabase.storage
    .from(ARTBOARD_BUCKET)
    .upload(path, file, {
      upsert: false,
      cacheControl: opts?.cacheControl ?? "3600",
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Falha no upload: ${error.message}`);
  }
  return { path };
}

/** Gera URL assinada para exibição (bucket é privado) */
export async function createArtboardSignedUrl(
  path: string,
  expiresInSec = 60 * 30, // 30 min
  supabase?: SupabaseClient
) {
  const client = supabase ?? createClient();
  const { data, error } = await client.storage
    .from(ARTBOARD_BUCKET)
    .createSignedUrl(path, expiresInSec);

  if (error) {
    throw new Error(`Falha ao gerar URL assinada: ${error.message}`);
  }
  return data.signedUrl;
}
