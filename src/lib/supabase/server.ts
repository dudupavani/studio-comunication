import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
// ✅ ajuste: aponte para onde os types foram gerados
import type { Database } from "@/types/supabase";

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");
  return { url, key };
}

/**
 * Cliente "read-only" para Server Components / layouts / loaders:
 * - Mantém assinatura síncrona (compatível com o código existente)
 * - Lê cookies via await internamente
 * - NUNCA tenta set/remove cookies neste contexto (no-op) — evita erro do Next
 */
export function createServerClientReadOnly() {
  const { url, key } = getEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      // leitura assíncrona, mas a factory é síncrona
      get: async (name: string) => {
        const store = await cookies();
        return store.get(name)?.value;
      },
      // no-ops: não escrevem cookies em RSC
      set: async (_name: string, _value: string, _options: CookieOptions) => {
        /* no-op in RSC */
      },
      remove: async (_name: string, _options: CookieOptions) => {
        /* no-op in RSC */
      },
    },
  });
}

/**
 * Cliente com leitura/escrita de cookies — use APENAS em Server Actions/Route Handlers.
 * Mantém assinatura síncrona por compatibilidade.
 */
export function createServerClientWithCookies() {
  const { url, key } = getEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      get: async (name: string) => {
        const store = await cookies();
        return store.get(name)?.value;
      },
      set: async (name: string, value: string, options: CookieOptions) => {
        try {
          const store = await cookies();
          (store as any).set?.({ name, value, ...options });
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[supabase] Unable to set cookie", err);
          }
        }
      },
      remove: async (name: string, options: CookieOptions) => {
        try {
          const store = await cookies();
          if ((store as any).delete) {
            (store as any).delete(name);
          } else {
            (store as any).set?.({ name, value: "", maxAge: 0, ...options });
          }
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[supabase] Unable to remove cookie", err);
          }
        }
      },
    },
  });
}

/**
 * Alias de compatibilidade: read-only por padrão (assinatura síncrona).
 * Em Server Actions/Routes, importe explicitamente createServerClientWithCookies().
 */
export function createClient() {
  return createServerClientReadOnly();
}
