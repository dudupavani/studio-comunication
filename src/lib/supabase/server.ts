import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  // Usa envs de servidor; cai para NEXT_PUBLIC_* só se necessário
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");
  }

  return createServerClient(url, key, {
    cookies: {
      // precisa ser síncrono
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Em Server Components, não dá pra mutar cookies — no-op
      set(name: string, value: string, options: CookieOptions) {},
      remove(name: string, options: CookieOptions) {},
    },
  });
}
