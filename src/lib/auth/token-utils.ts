// src/lib/auth/token-utils.ts

// Converte Base64URL → Base64 comum e decodifica para UTF-8
export function b64UrlDecodeToString(input: string): string {
  const clean = (input || "").trim();
  const pad = "=".repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + pad).replace(/-/g, "+").replace(/_/g, "/");

  // Browser
  if (typeof window !== "undefined" && typeof atob === "function") {
    return decodeUtf8(atob(base64));
  }

  // Node/Edge Runtime
  return Buffer.from(base64, "base64").toString("utf-8");
}

function decodeUtf8(b64decoded: string): string {
  try {
    // tenta tratar multibyte (escape%xx) quando necessário
    return decodeURIComponent(
      b64decoded
        .split("")
        .map((c) => {
          const hex = c.charCodeAt(0).toString(16).padStart(2, "0");
          return `%${hex}`;
        })
        .join("")
    );
  } catch {
    // fallback: já está em UTF-8 legível
    return b64decoded;
  }
}

// Remove prefixo "base64-" se estiver presente
export function stripBase64Prefix(value: string): string {
  return value?.startsWith("base64-") ? value.slice("base64-".length) : value;
}

// Tenta parsear como JSON cru; se falhar, tenta Base64/URL+JSON
export function parseMaybeBase64JSON<T = any>(value: string): T {
  const raw = (value ?? "").trim();
  // 1) tenta JSON direto
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 2) tenta Base64/URL -> texto -> JSON
    try {
      const text = b64UrlDecodeToString(stripBase64Prefix(raw));
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Valor não é JSON nem Base64-JSON válidos.");
    }
  }
}

// Extrai claims do JWT (payload base64url do formato header.payload.signature)
export function parseJWTClaims<T = Record<string, unknown>>(jwt: string): T {
  const parts = String(jwt ?? "").split(".");
  if (parts.length < 2) throw new Error("JWT inválido: payload ausente.");
  const payloadText = b64UrlDecodeToString(parts[1]);
  return JSON.parse(payloadText) as T;
}

// Tipagem opcional para sessões do Supabase (ajuste se quiser ser mais estrito)
export type SerializableSession = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  user: {
    id: string;
    email?: string;
    [k: string]: any;
  };
  [k: string]: any;
};
