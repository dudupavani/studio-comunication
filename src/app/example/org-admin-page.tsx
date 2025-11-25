// src/app/example/org-admin-page.tsx
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { notFound } from "next/navigation";

export default async function OrgAdminPage({ params }: { params: Promise<{ orgId: string }> }) {
  // In newer versions of Next.js, params is a Promise that must be awaited
  const { orgId } = await params;
  
  // Protege a página - só org_admin ou platform_admin podem acessar (simplificado)
  const auth = await getAuthContext();
  if (!auth || auth.orgId !== orgId || !auth.platformRole && auth.orgRole !== "org_admin") {
    notFound();
  }
  
  const supabase = createClient();
  
  // Agora podemos buscar dados com segurança
  const { data: org, error } = await supabase
    .from("orgs")
    .select("name, slug")
    .eq("id", orgId)
    .single();
  
  if (error) {
    throw new Error("Falha ao carregar organização");
  }
  
  return (
    <div>
      <h1>Página restrita para administradores da organização: {org.name}</h1>
      <p>Olá, {auth.userId}. Você tem permissão para acessar esta página.</p>
    </div>
  );
}
