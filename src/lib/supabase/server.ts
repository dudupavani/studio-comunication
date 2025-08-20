import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");

  return createServerClient<Database>(url, key, {
    cookies: {
      // ✅ leitura com await
      get: async (name: string) => {
        const store = await cookies();
        return store.get(name)?.value;
      },

      // ✅ escrita só funciona em Server Action/Route Handler (não em RSC)
      set: async (name: string, value: string, options: CookieOptions) => {
        try {
          const store = await cookies();
          (store as any).set?.({ name, value, ...options });
        } catch (err) {
          console.warn("cookies.set não disponível neste contexto:", err);
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
          console.warn("cookies.remove não disponível neste contexto:", err);
        }
      },
    },
  });
}
