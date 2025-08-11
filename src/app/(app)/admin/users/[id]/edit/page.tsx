import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditUserForm } from "@/components/admin/edit-user-form";
import { getUserById } from "@/lib/actions/user"; // <-- SINGULAR

// Em versões recentes do Next, params pode ser Promise em Server Components
export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUserById(id);
  if (!user) {
    notFound();
  }

  return (
    <div className="container flex flex-col items-center py-8">
      <div className="flex items-center gap-4 mb-6 self-start">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Gerenciar usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Editar dados e permissão de acesso.
          </p>
        </div>
      </div>

      <EditUserForm user={user} />
    </div>
  );
}
