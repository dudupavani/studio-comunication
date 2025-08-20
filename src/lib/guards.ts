import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

export async function requireAuthAndPasswordGuard() {
  // 1) Verifica sessão diretamente no Supabase Auth
  const supabase = createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    // sem sessão => login
    redirect("/login");
  }

  // 2) Força troca de senha (metadado do usuário)
  const mustReset = Boolean(user.user_metadata?.must_reset_password);
  if (mustReset) {
    redirect("/auth/force-password");
  }

  // 3) Contexto de autorização da aplicação
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  return auth; // { userId, platformRole, orgRole, unitIds }
}
