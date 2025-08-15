import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";

export async function requireAuthAndPasswordGuard() {
  const auth = await getAuthContext();
  if (!auth) redirect("/"); // ou /login

  // força troca de senha antes de acessar o app
  if (auth.user?.user_metadata?.must_reset_password) {
    redirect("/auth/force-password");
  }
  return auth;
}
