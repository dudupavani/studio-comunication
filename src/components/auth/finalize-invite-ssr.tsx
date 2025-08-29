// src/components/auth/finalize-invite-ssr.tsx
// Server Component: chama /api/auth/finalize-invite em toda renderização autenticada.
// Seguro porque o endpoint é idempotente.
export default async function FinalizeInviteSSR() {
  try {
    // fetch relativo inclui cookies automaticamente no App Router
    await fetch("/api/auth/finalize-invite", {
      method: "POST",
      cache: "no-store",
      // credentials: "include" não é necessário para relative no server,
      // mas se seu linter implicar, pode manter: credentials: "include" as any
    });
  } catch {
    // Silencioso: não quebra a página por causa de finalize
  }
  return null;
}
