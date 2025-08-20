// src/app/example/org-admin-page.tsx
import { requireOrgAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export default async function OrgAdminPage({ params }: { params: { orgId: string } }) {
  // Protege a página - só org_admin ou platform_admin podem acessar
  const auth = await requireOrgAdmin(params.orgId);
  
  const supabase = createClient();
  
  // Agora podemos buscar dados com segurança
  const { data: org, error } = await supabase
    .from("orgs")
    .select("name, slug")
    .eq("id", params.orgId)
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