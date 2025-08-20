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
    <div className="container flex flex-col pt-8 pb-12 px-8">
      <div className="flex items-center gap-4 mb-8 self-start">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Detalhes do usuário
          </h1>
        </div>
      </div>

      <EditUserForm user={user} />
    </div>
  );
}
