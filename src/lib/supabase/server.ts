import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore.get(name))?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `cookies()` helper can be called only from a Server Component or Server Action.
            // This error is typically caused by an attempt to set a cookie from a Client Component.
            // Many of these are fixed by moving `supabase.auth.onAuthStateChange` inside of a
            // Server Component or Server Action.
            console.warn("Failed to set cookie:", error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // The `cookies()` helper can be called only from a Server Component or Server Action.
            // This error is typically caused by an attempt to set a cookie from a Client Component.
            // Many of these are fixed by moving `supabase.auth.onAuthStateChange` inside of a
            // Server Component or Server Action.
            console.warn("Failed to remove cookie:", error);
          }
        },
      },
    }
  );
}
