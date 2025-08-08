import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookies().set({ name, value, ...options });
          } catch (error) {
            console.warn("Failed to set cookie:", error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookies().set({ name, value: "", ...options });
          } catch (error) {
            console.warn("Failed to remove cookie:", error);
          }
        },
      },
    }
  );
}
