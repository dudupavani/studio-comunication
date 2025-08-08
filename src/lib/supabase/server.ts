// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ leitura assíncrona
        get: async (name: string) => {
          const store = await cookies();
          return store.get(name)?.value;
        },

        // ✅ escrita assíncrona (Server Action/Route Handler)
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            const store = await cookies();
            // Next 14/15: set aceita objeto { name, value, ...options }
            (store as any).set
              ? (store as any).set({ name, value, ...options })
              : null;
          } catch (error) {
            console.warn("Failed to set cookie:", error);
          }
        },

        // ✅ remoção assíncrona (usa delete se existir; fallback maxAge=0)
        remove: async (name: string, options: CookieOptions) => {
          try {
            const store = await cookies();
            if ((store as any).delete) {
              (store as any).delete(name);
            } else if ((store as any).set) {
              (store as any).set({ name, value: "", maxAge: 0, ...options });
            }
          } catch (error) {
            console.warn("Failed to remove cookie:", error);
          }
        },
      },
    }
  );
}
