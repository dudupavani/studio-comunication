import { EditUserForm } from "@/components/admin/edit-user-form";
import { getUserById } from "@/lib/actions/user";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUserById(params.id);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col items-start pt-8 pb-12 px-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold text-gray-800">
          Detalhes do usuário
        </h2>
      </div>
      <div className="w-full max-w-2xl">
        <EditUserForm user={user} />
      </div>
    </div>
  );
}
